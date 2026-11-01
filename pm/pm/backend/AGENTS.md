# Backend

FastAPI app, managed with uv (`pyproject.toml`, `uv.lock`). Python 3.14. Database design: `docs/DATABASE.md`.

## Layout

- `app/main.py` - FastAPI app. Creates or migrates the db on startup (lifespan). Every route except health and auth login/register needs the `session` cookie (401 without a valid one); the `current_user` dependency resolves it. Routes:
  - `GET /api/health` - `{"status": "ok"}`
  - `POST /api/auth/register` `{username, password}` - 201, creates the user with a seeded board and signs in. 409 if taken; 422 if the username is not 3-32 of `[A-Za-z0-9_.-]` or the password is under 8 characters
  - `POST /api/auth/login` - signs in (sets the HttpOnly `session` cookie, 30 days); 401 on bad credentials
  - `POST /api/auth/logout` - deletes the session and clears the cookie (204)
  - `GET /api/auth/me` - `{id, username}`
  - `PUT /api/auth/password` `{current, new}` - 204; 403 if `current` is wrong
  - `DELETE /api/auth/me` - deletes the user, their sessions and boards (204)
  - `GET /api/boards` - `[{id, name, cardCount, updatedAt}]`, oldest first
  - `POST /api/boards` `{name}` - 201, a new board with the default columns and no cards. Names are trimmed, 1-60 characters
  - `GET /api/boards/{id}`, `PUT /api/boards/{id}` - read or replace the board data (`Board`); invalid boards get 422
  - `PATCH /api/boards/{id}` `{name}` - rename; `DELETE /api/boards/{id}` - 204
  - `POST /api/boards/{id}/chat` - `{message, history: [{role, content}]}` -> `{reply, board}`. Sends the conversation and the board to the AI. If the AI returns a board, it is validated with `Board` and saved; `board` is null when nothing changed. 502 (nothing saved) if the OpenRouter call fails, the response does not match the schema, the AI returns an invalid board or changes the column ids or their order (columns are fixed; renames are allowed), or the response is empty
  - Another user's board is 404 on every board route
  - Static files mounted at `/` from `STATIC_DIR` (default `backend/static`, gitignored; `/app/static` in Docker, holding the Next.js export). Registered last so `/api` routes win
- `app/models.py` - Pydantic models. `Card` (optional `priority`: low/medium/high, optional `dueDate`: date), `Column`, `Board` mirror the frontend `BoardData`; extra fields forbidden; `Board` checks unique column ids, card keys match ids, and every card is in exactly one column. Request and response models for auth, boards and chat
- `app/db.py` - stdlib `sqlite3`, foreign keys on. `init_db()` creates tables, migrates a version 0 database (`PRAGMA user_version`) and ensures the demo user `user` / `password`. Passwords: `hashlib.scrypt` with a random salt. Users, sessions and board functions all take the owner's `user_id`, so queries are scoped to that user. DB path from `DB_PATH` (default `/data/app.db`)
- `app/ai.py` - OpenRouter through the `openai` SDK, model `openai/gpt-oss-120b`. The client is created per call from `OPENROUTER_API_KEY`, so the app and tests run without a key
  - `chat(board, message, history)` - Structured Outputs via `chat.completions.parse(response_format=AIResponse)`; returns `AIResponse {reply, board: AIBoard | None}`, or None if the model returned empty content
  - `AIBoard` is the board with `cards` as a list (strict Structured Outputs does not allow objects with arbitrary keys); `from_board` / `to_board` convert, and `to_board` runs the `Board` checks
  - The latest user message holds today's date and the board, after the history. With the board in the system prompt the model sometimes re-applied earlier requests (duplicate cards)
  - OpenRouter provider routing: `require_parameters` (only providers that support `response_format`) and `ignore: ["CoreWeave"]` (it returns no reasoning for this model and often scrambles the board)
- `app/default_board.json` - seed board for new users, a copy of the frontend `initialData`
- `tests/conftest.py` - points `STATIC_DIR` at a temp dir with a stub `index.html`. Fixtures: `db_path` (temp `DB_PATH`), `anon` (a started `TestClient`, signed out), `client` (signed in as the demo user), `board_id` (the demo user's board). `register(username)` returns another signed-in client
- `tests/test_main.py` - health and static index
- `tests/test_auth.py` - sign in, wrong password, register, duplicates, validation, hashing, logout, change password, delete account, every protected route is 401 without a session
- `tests/test_boards.py` - db creation and demo user, seeded board, create, rename, delete, save and load, priority and due date, persistence across restarts, isolation between users, invalid boards
- `tests/test_migration.py` - a Part 6 database is migrated and keeps its board
- `tests/test_chat.py` - chat with the AI client mocked (`mock_ai`): reply only, board saved, invalid board not saved, added, removed or reordered columns not saved, renamed column saved, OpenRouter and schema errors are 502, empty response, messages sent, only the given board changes. Live tests (skipped without a key): a question returns no board; adding a card to Backlog

## Commands

- `scripts/test-backend.sh` - run pytest in a Python 3.14 container (no local Python needed); add `--cov=app --cov-report=term-missing` for coverage
- With uv installed locally: `uv sync`, `uv run pytest`. To include the live AI tests, set `OPENROUTER_API_KEY` (from `pm/.env`) first
- `uv run uvicorn app.main:app --reload` - run locally on port 8000. Set `DB_PATH` (for example `DB_PATH=app.db`) and either build the frontend and copy `frontend/out` to `backend/static`, or set `STATIC_DIR`

In Docker, a Node stage builds the frontend and the Python stage copies `out/` to `/app/static`. The image runs `uvicorn app.main:app --host 0.0.0.0 --port 8000` from `/app`, with the `pm-data` volume at `/data`.
