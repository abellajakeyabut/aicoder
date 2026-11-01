import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from openai import OpenAIError
from pydantic import ValidationError

from app import db
from app.ai import chat
from app.models import (
    Board,
    BoardCreate,
    BoardRename,
    BoardSummary,
    ChatRequest,
    ChatResponse,
    Credentials,
    Login,
    PasswordChange,
    User,
)

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).parent.parent / "static"))
SESSION_COOKIE = "session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(lifespan=lifespan)


def current_user(session: Annotated[str | None, Cookie()] = None) -> User:
    user = db.session_user(session) if session else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not signed in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def start_session(response: Response, user: User):
    token = db.create_session(user.id)
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_MAX_AGE, httponly=True, samesite="lax")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Auth


@app.post("/api/auth/register", status_code=201)
def register(credentials: Credentials, response: Response) -> User:
    user = db.create_user(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(status_code=409, detail="That username is taken")
    start_session(response, user)
    return user


@app.post("/api/auth/login")
def login(credentials: Login, response: Response) -> User:
    user = db.authenticate(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    start_session(response, user)
    return user


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response, session: Annotated[str | None, Cookie()] = None):
    if session:
        db.delete_session(session)
    response.delete_cookie(SESSION_COOKIE)


@app.get("/api/auth/me")
def me(user: CurrentUser) -> User:
    return user


@app.put("/api/auth/password", status_code=204)
def change_password(change: PasswordChange, user: CurrentUser):
    if not db.change_password(user, change.current, change.new):
        raise HTTPException(status_code=403, detail="Current password is wrong")


@app.delete("/api/auth/me", status_code=204)
def delete_account(user: CurrentUser, response: Response):
    db.delete_user(user.id)
    response.delete_cookie(SESSION_COOKIE)


# Boards


def owned_board(user: User, board_id: int) -> Board:
    board = db.get_board(user.id, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.get("/api/boards")
def list_boards(user: CurrentUser) -> list[BoardSummary]:
    return db.list_boards(user.id)


@app.post("/api/boards", status_code=201)
def create_board(body: BoardCreate, user: CurrentUser) -> BoardSummary:
    return db.create_board(user.id, body.name)


@app.get("/api/boards/{board_id}")
def read_board(board_id: int, user: CurrentUser) -> Board:
    return owned_board(user, board_id)


@app.put("/api/boards/{board_id}")
def update_board(board_id: int, board: Board, user: CurrentUser) -> Board:
    if not db.save_board(user.id, board_id, board):
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.patch("/api/boards/{board_id}")
def rename_board(board_id: int, body: BoardRename, user: CurrentUser) -> BoardSummary:
    board = db.rename_board(user.id, board_id, body.name)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.delete("/api/boards/{board_id}", status_code=204)
def delete_board(board_id: int, user: CurrentUser):
    if not db.delete_board(user.id, board_id):
        raise HTTPException(status_code=404, detail="Board not found")


@app.post("/api/boards/{board_id}/chat")
def chat_with_ai(board_id: int, request: ChatRequest, user: CurrentUser) -> ChatResponse:
    current = owned_board(user, board_id)
    try:
        result = chat(current, request.message, request.history)
    except (OpenAIError, ValidationError):
        # OpenRouter errors, or a response that doesn't match AIResponse
        raise HTTPException(status_code=502, detail="The AI request failed")
    if result is None:
        # The SDK gives no parsed result when the model returns empty content or a refusal
        raise HTTPException(status_code=502, detail="The AI returned an empty response")
    if result.board is None:
        return ChatResponse(reply=result.reply, board=None)
    try:
        board = result.board.to_board()
    except ValidationError:
        raise HTTPException(status_code=502, detail="The AI returned an invalid board")
    # Columns are fixed: the AI may rename them but not add, remove or reorder them
    if [column.id for column in board.columns] != [column.id for column in current.columns]:
        raise HTTPException(status_code=502, detail="The AI changed the columns")
    db.save_board(user.id, board_id, board)
    return ChatResponse(reply=result.reply, board=board)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
