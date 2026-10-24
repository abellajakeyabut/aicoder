# Backend

FastAPI app, managed with uv (`pyproject.toml`, `uv.lock`). Python 3.14. Database design: `docs/DATABASE.md`.

## Layout

- `app/main.py` - FastAPI app. Creates the db on startup (lifespan). Routes:
  - `GET /api/health` - `{"status": "ok"}`
  - `GET /api/board` - the board for the fixed user `user` (seeded with the default board on first read)
  - `PUT /api/board` - validate and replace the whole board; returns it. Invalid boards get 422
  - `POST /api/chat` - `{message, history: [{role, content}]}` -> `{reply, board}`. Sends the conversation and current board to the AI. If the AI returns a board, it is validated with `Board` and saved; `board` is null when nothing changed. 502 (nothing saved) if the OpenRouter call fails, the response does not match the schema, the AI returns an invalid board or changes the column ids or their order (columns are fixed; renames are allowed), or the response is empty
  - Static files mounted at `/` from `STATIC_DIR` (default `backend/static`, gitignored; `/app/static` in Docker, holding the Next.js export). Registered last so `/api` routes win
- `app/models.py` - Pydantic `Card`, `Column`, `Board` mirroring the frontend `BoardData`; extra fields forbidden; `Board` checks unique column ids, card keys match ids, and every card is in exactly one column. Also `Message`, `ChatRequest`, `ChatResponse` for `/api/chat`
- `app/db.py` - stdlib `sqlite3`. `init_db()`, `get_board(username)`, `save_board(username, board)`. DB path from `DB_PATH` (default `/data/app.db`)
- `app/ai.py` - OpenRouter through the `openai` SDK, model `openai/gpt-oss-120b`. The client is created per call from `OPENROUTER_API_KEY`, so the app and tests run without a key
  - `chat(board, message, history)` - Structured Outputs via `chat.completions.parse(response_format=AIResponse)`; returns `AIResponse {reply, board: AIBoard | None}`, or None if the model returned empty content
  - `AIBoard` is the board with `cards` as a list (strict Structured Outputs does not allow objects with arbitrary keys); `from_board` / `to_board` convert, and `to_board` runs the `Board` checks
  - The board goes in the latest user message, after the history. With it in the system prompt the model sometimes re-applied earlier requests (duplicate cards)
  - OpenRouter provider routing: `require_parameters` (only providers that support `response_format`) and `ignore: ["CoreWeave"]` (it returns no reasoning for this model and often scrambles the board)
- `app/default_board.json` - seed board, a copy of the frontend `initialData`
- `tests/conftest.py` - points `STATIC_DIR` at a temp dir with a stub `index.html`, so tests don't need a frontend build. Fixtures: `db_path` (temp `DB_PATH`) and `client` (a `TestClient` with startup run)
- `tests/test_main.py` - health and static index
- `tests/test_board.py` - db creation, seeding, save and load, persistence across restarts, invalid boards (each test uses a temp `DB_PATH`)
- `tests/test_chat.py` - `/api/chat` with the AI client mocked (`mock_ai`): reply only, board saved, invalid board not saved, added, removed or reordered columns not saved, renamed column saved, OpenRouter and schema errors are 502, empty response, messages sent. Live tests (skipped without a key): a question returns no board; adding a card to Backlog

## Commands

- `uv sync` - install dependencies
- `uv run pytest` - run tests. To include the live AI tests, set `OPENROUTER_API_KEY` (from `pm/.env`) first
- `uv run uvicorn app.main:app --reload` - run locally on port 8000. Set `DB_PATH` (for example `DB_PATH=app.db`) and either build the frontend and copy `frontend/out` to `backend/static`, or set `STATIC_DIR`

In Docker, a Node stage builds the frontend and the Python stage copies `out/` to `/app/static`. The image runs `uvicorn app.main:app --host 0.0.0.0 --port 8000` from `/app`, with the `pm-data` volume at `/data`.
