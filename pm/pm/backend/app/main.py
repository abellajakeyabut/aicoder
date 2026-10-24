import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.ai import ask, chat
from app.db import get_board, init_db, save_board
from app.models import Board, ChatRequest, ChatResponse

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).parent.parent / "static"))

# Sign-in is frontend-only for the MVP, so the API always acts as this user
USERNAME = "user"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/board")
def read_board() -> Board:
    return get_board(USERNAME)


@app.put("/api/board")
def update_board(board: Board) -> Board:
    save_board(USERNAME, board)
    return board


@app.post("/api/ai/test")
def ai_test():
    return {"reply": ask("What is 2+2?")}


@app.post("/api/chat")
def chat_with_ai(request: ChatRequest) -> ChatResponse:
    result = chat(get_board(USERNAME), request.message, request.history)
    if result is None:
        # The SDK gives no parsed result when the model returns empty content or a refusal
        raise HTTPException(status_code=502, detail="The AI returned an empty response")
    if result.board is None:
        return ChatResponse(reply=result.reply, board=None)
    try:
        board = result.board.to_board()
    except ValidationError:
        raise HTTPException(status_code=502, detail="The AI returned an invalid board")
    save_board(USERNAME, board)
    return ChatResponse(reply=result.reply, board=board)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
