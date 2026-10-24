# Project Plan

Each part has substeps to check off, tests, and success criteria. Do not start a part until the previous one meets its success criteria. Parts marked "user sign-off" stop for approval.

Status: Parts 1-10 are done.

## Key decisions

Runtime and packaging
- One Docker container, port 8000. FastAPI serves the API under `/api` and the static Next.js export at `/`. The static mount is registered after the API routes so `/api` wins.
- Multi-stage `Dockerfile`: a `node:24-slim` stage runs `npm ci && npm run build`; the `python:3.14-slim` stage (uv copied from `ghcr.io/astral-sh/uv`) runs `uv sync --frozen --no-dev` and copies `frontend/out` to `/app/static`. No Node at runtime.
- Python 3.14, dependencies managed with uv (`backend/pyproject.toml`, `uv.lock`). Test client dependency is `httpx2` (Starlette deprecates `httpx` for `TestClient`).
- Scripts: `scripts/start.sh|ps1` build the image, replace any `pm-app` container, and run it with volume `pm-data:/data`, passing `--env-file .env` only when `.env` exists. `scripts/stop.sh|ps1` remove the container and keep the volume. Docker Desktop must be running.
- Env vars: `OPENROUTER_API_KEY` (in `pm/.env`, gitignored), `DB_PATH` (default `/data/app.db`), `STATIC_DIR` (default `backend/static`, gitignored; `/app/static` in Docker).

Data
- SQLite via stdlib `sqlite3` (no ORM), on the `pm-data` named volume so it survives restarts. Tables are created on startup if missing. Design approved in `docs/DATABASE.md`; JSON Schema in `docs/board-schema.json`.
- Tables: `users(id, username)` and `boards(id, user_id UNIQUE, data, updated_at)`. `data` is the whole board as JSON in the frontend `BoardData` shape. One board per user.
- The first `GET /api/board` creates user `user` and seeds `backend/app/default_board.json` (a copy of the frontend `initialData`: 5 columns, 8 cards).
- API reads and replaces the whole board (`GET` / `PUT /api/board`). Pydantic validates: extra fields forbidden, column ids unique, card keys match ids, every card in exactly one column, every `cardIds` entry exists. Invalid boards get 422 and nothing is saved.

Frontend
- Static export (`output: "export"`). Under `next dev`, `next.config.ts` rewrites `/api/*` to `http://localhost:8000` (rewrites only work in dev, not in a static export).
- Sign-in is frontend-only: the browser checks `user`/`password` and stores localStorage `pm-auth`. `page.tsx` reads it with `useSyncExternalStore` (null during prerender, so nothing renders until the client knows). The backend API always acts as the fixed user `user` and is unauthenticated: anyone who can reach port 8000 can read and replace the board. Real sign-in must add a backend check before the app is exposed beyond localhost.
- The board loads on mount. Every change sets state and PUTs the whole board. Saves are chained so they reach the backend in order, because column renames save on every keystroke. A failed save doesn't block later ones.
- Cards are edited with an Edit button that opens an inline form. While editing, dnd-kit attributes and listeners are not applied (otherwise the form sits inside a disabled `role="button"`).
- Styling follows the existing demo: the AGENTS.md colors as CSS variables, rounded white cards on a light surface, soft navy shadows, Space Grotesk and Manrope fonts. New UI (login, chat) reuses it.

AI
- OpenRouter through the `openai` Python SDK, model `openai/gpt-oss-120b`. `app/ai.py` creates the client per call, so the app starts without a key.
- Chat uses Structured Outputs; the current board goes in the latest user message (after the history), and the CoreWeave provider is excluded. Details in `backend/AGENTS.md`.

Testing
- Backend: pytest with a temp `DB_PATH` per test; `tests/conftest.py` points `STATIC_DIR` at a stub `index.html` so tests don't need a frontend build.
- Frontend unit: Vitest + Testing Library; `src/test/mockApi.ts` stubs `fetch`.
- No live OpenRouter calls when testing (cost): run pytest without `OPENROUTER_API_KEY`, and mock `/api/chat` in frontend tests.
- E2E: Playwright needs the backend running (the container), because tests use and reset the stored board (`resetBoard` PUTs `initialData`). One worker only, since tests share that board. Run against the container with `BASE_URL=http://localhost:8000`, or against `next dev` (proxied to the container). Running e2e resets the stored board.

## Part 1: Plan

- [x] Enrich this document with substeps, tests and success criteria for every part
- [x] Create `frontend/AGENTS.md` describing the existing frontend
- [x] User reviews and approves this plan (user sign-off)

Success criteria: the user approves the plan.

## Part 2: Scaffolding

Goal: a container running FastAPI that serves a hello-world page and an API endpoint, started and stopped by scripts.

- [x] `backend/pyproject.toml` (uv project) with `fastapi` and `uvicorn`; dev dependencies `pytest`, `httpx2`
- [x] `backend/app/main.py`: `GET /api/health` returns `{"status": "ok"}`; serve `backend/static/index.html` (hello world) at `/` (replaced by the frontend in Part 3)
- [x] Hello-world page calls `/api/health` with fetch and displays the result
- [x] `Dockerfile` at the project root: python + uv image, `uv sync --frozen`, run uvicorn on 0.0.0.0:8000
- [x] `.dockerignore` (.git, .env, node_modules, .next, out, .venv, __pycache__, .pytest_cache, test-results, playwright-report)
- [x] `scripts/start.sh` and `scripts/stop.sh` (Mac and Linux), `scripts/start.ps1` and `scripts/stop.ps1` (PC): build the image, run the container named `pm-app` on port 8000 with `--env-file .env` (when present) and volume `pm-data:/data`; stop removes the container
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md`

Tests:
- `backend/tests/test_main.py`: `/api/health` returns 200 and `{"status": "ok"}`; `/` returns HTML
- Manual: run the start script; check `/api/health`; open `localhost:8000` and see hello world plus the API result; the stop script removes the container

Success criteria: pytest passes; the start and stop scripts work on the user's PC; the page shows the API response.

## Part 3: Add in Frontend

Goal: the demo Kanban board is statically built and served at `/` from the container.

- [x] Set `output: "export"` in `frontend/next.config.ts`
- [x] Multi-stage Dockerfile: Node stage runs `npm ci && npm run build`; the Python stage copies `frontend/out` to `/app/static`
- [x] FastAPI mounts `STATIC_DIR` at `/` with `html=True`, after the API routes; remove the hello-world page
- [x] Point Playwright at the container via a `BASE_URL` env var (no dev server started when set), keeping `next dev` as the default
- [x] Update `frontend/AGENTS.md` and `backend/AGENTS.md`

Tests:
- Existing Vitest unit tests pass
- Existing Playwright tests pass against `next dev` and against the container (`BASE_URL=http://localhost:8000`)
- pytest: `/` serves `index.html` from `STATIC_DIR` (a stub from `conftest.py`); `/api/health` still works. The real page is checked by Playwright against the container

Success criteria: `localhost:8000` shows the working Kanban board (drag, add, delete, rename); all tests pass.

## Part 4: Fake user sign in

Goal: `/` shows a login form first; `user`/`password` reveals the board; the user can log out.

- [x] `src/lib/auth.ts`: `login(username, password)` returns true for `user`/`password` and sets localStorage `pm-auth`; `logout()`; `isLoggedIn()`; `subscribe()` for `useSyncExternalStore`
- [x] `src/components/LoginForm.tsx`: username and password fields, purple submit button, error message on bad credentials
- [x] `page.tsx`: render `LoginForm` or `KanbanBoard` based on auth state, read with `useSyncExternalStore` (server snapshot null) to avoid a hydration mismatch
- [x] Log out button in the board header
- [x] Update `frontend/AGENTS.md`

Tests:
- Unit (`auth.test.ts`, `page.test.tsx`): the auth helpers; wrong credentials show an error; a correct login shows the board; already logged in shows the board; logout returns to the login form
- E2E (`auth.spec.ts`): visit `/` and see the login form; a wrong password shows an error; log in and see the board; reload and stay logged in; log out and see the login form
- The existing e2e tests log in first (`tests/helpers.ts`)
- Note: Next.js renders an empty `role="alert"` route announcer, so e2e tests filter `getByRole("alert")` by text

Success criteria: the board cannot be seen without logging in; all tests pass in dev and in the container.

## Part 5: Database modeling (user sign-off)

Goal: agree on the schema before building the API.

- [x] `docs/DATABASE.md`: tables, columns, types, and the reasons for storing the board as one JSON blob (simple, matches the frontend shape, the AI returns whole boards)
- [x] `docs/board-schema.json`: JSON Schema (draft 2020-12) for `BoardData`, plus an example board
- [x] Document the lifecycle: create the db file and tables on startup if missing; on the first `GET /api/board` for a user with no board, create the user and seed the default 5-column board
- [x] User reviews and approves

Schema:
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  data TEXT NOT NULL,           -- BoardData JSON
  updated_at TEXT NOT NULL      -- ISO 8601 UTC
);
```

Checks: the schema is valid, and both the example and the frontend `initialData` pass it.

Success criteria: the user signs off on DATABASE.md.

## Part 6: Backend API

Goal: API routes to read and replace the user's board, persisted in SQLite.

- [x] `backend/app/db.py`: `init_db()` creates tables; `get_board(username)` (seeds from `default_board.json` if missing); `save_board(username, board)` (upsert, sets `updated_at`). Uses stdlib `sqlite3`; the DB path comes from `DB_PATH` (default `/data/app.db`)
- [x] `backend/app/models.py`: Pydantic `Card`, `Column`, `Board` mirroring `BoardData`, extra fields forbidden, with the reference checks listed in Key decisions
- [x] `GET /api/board` returns the board for `user`
- [x] `PUT /api/board` validates and saves the full board, returns it
- [x] Call `init_db()` on app startup (lifespan)
- [x] Update `backend/AGENTS.md`

Tests (`tests/test_board.py`, temp `DB_PATH` per test):
- The DB file and tables are created on startup
- The first GET seeds the default board (5 columns, 8 cards) and creates user `user`
- A PUT followed by a GET returns the same board
- Data persists across app restarts using the same file
- `updated_at` changes on save
- Invalid boards are rejected with 422 and the stored board is unchanged: unknown card id, card in two columns, card in no column, card key mismatch, duplicate column id, wrong type, missing field, extra field

Success criteria: all backend tests pass; the board persists in the container across restarts.

## Part 7: Frontend + Backend

Goal: the board is loaded from and saved to the backend, so it persists.

- [x] `src/lib/api.ts`: `fetchBoard()` and `saveBoard(board)` (saves chained so they run in order)
- [x] `KanbanBoard`: load on mount ("Loading board..."); after each change (rename, add, edit, delete, move) `commit` sets state and PUTs the new board
- [x] Add card editing (Edit button opens an inline title and details form with Save and Cancel), which the business requirements need
- [x] For `next dev`, rewrite `/api/*` to the backend on 8000
- [x] Update `frontend/AGENTS.md`

Tests:
- Unit (fetch mocked with `src/test/mockApi.ts`): loading state, then board from API data; rename, add, delete and edit each save the expected board; cancel edit doesn't save; `api.test.ts` checks error responses, ordered saves, and that saving continues after a failure
- E2E (`persistence.spec.ts`, `kanban.spec.ts`): rename, add, edit and move, then reload and see all kept; edit card. Each test resets the board first
- Manual: change the board, stop and start the container, see the change kept, then reset to the default
- Backend tests still pass
- `npx tsc --noEmit` is clean (fixed `src/test/vitest.d.ts` to reference `vitest/globals`)

Success criteria: all changes persist across reloads and container restarts; all tests pass.

## Part 8: AI connectivity

Goal: the backend can call OpenRouter.

Prerequisite: `pm/.env` contains `OPENROUTER_API_KEY`.

- [x] Add the `openai` dependency; `backend/app/ai.py` creates a client with `base_url="https://openrouter.ai/api/v1"`, `OPENROUTER_API_KEY`, and model `openai/gpt-oss-120b`
- [x] `POST /api/ai/test` sends "What is 2+2?" and returns the reply text
- [x] Update `backend/AGENTS.md`

Tests:
- pytest live test (skipped when `OPENROUTER_API_KEY` is not set): the reply contains "4"
- Manual: `POST localhost:8000/api/ai/test` in the container returns a reply containing 4

Success criteria: a real AI response comes back from inside the container.

## Part 9: AI with board context and Structured Outputs

Goal: a chat endpoint that sends the board and the conversation to the AI and can apply board updates.

- [x] `POST /api/chat` request: `{message: str, history: [{role, content}]}`
- [x] The system prompt explains the board JSON format and the rules (keep ids stable, create ids for new cards, return the full board only when changing it); include the current board JSON (sent in the latest user message, see Findings)
- [x] Response format: Structured Outputs (`response_format` JSON schema) for `{reply: str, board: Board | null}`, parsed with Pydantic. The AI-facing `AIBoard` lists cards as an array (strict mode does not allow the `cards` map) and is converted back to `Board`
- [x] If `board` is present, validate it with the Part 6 `Board` model and save it; return `{reply, board}` to the client. Invalid board or empty AI response: 502, nothing saved
- [x] Remove `/api/ai/test` or keep it only as a connectivity check (kept; removed after the code review in `docs/code_review.md`)
- [x] Update `backend/AGENTS.md`

Tests:
- pytest with the AI client mocked: a reply-only response leaves the board unchanged; a response with a board saves it; an invalid board is not saved and returns an error; an empty AI response returns an error; history and board JSON are included in the messages sent
- Live tests (skipped without a key): "What columns are there?" returns a reply without a board; "Add a card called Test to Backlog" returns a board with that card in Backlog
- Manual (container): a 5-turn conversation (add, rename and move "that card", move two cards, a question, rename a column), run 3 times, ends with the expected board each time

Findings:
- With the board in the system prompt, the model sometimes re-applied earlier requests from the history (26/30 correct on a follow-up turn). Moving the board into the latest user message: 30/30
- The CoreWeave provider returned no reasoning and scrambled boards; it is excluded via OpenRouter provider `ignore`
- Rarely a provider returns empty content (`parsed` is None); the endpoint returns 502

Success criteria: mocked and live tests pass; the AI can create, edit and move cards through the endpoint.

## Part 10: AI chat sidebar

Goal: a polished chat sidebar where the AI can update the board, with the board refreshing automatically.

- [x] `src/components/ChatSidebar.tsx`: a collapsible right sidebar with a message list (user and assistant bubbles), a textarea, a purple send button, a loading indicator and an error message; styled like the rest of the app
- [x] Keep the conversation history in component state and send it with each message
- [x] When the response includes a board, update the board state in `KanbanBoard` with `setBoard` (not `commit`: the backend already saved it)
- [x] Layout works with the sidebar open or closed (the column grid uses container queries on the board width)
- [x] Update `frontend/AGENTS.md`

Tests:
- Unit (fetch mocked): sending shows the user message, the loading state, then the reply; a response with a board updates the rendered cards without a PUT; errors are shown
- E2E against the container with `/api/chat` answered in the browser by `page.route` (no live AI, to avoid OpenRouter costs): log in, ask the AI to add a card, and see the card appear without a reload; with the sidebar open the board has no horizontal overflow. The live AI and backend save path were verified in Part 9
- Manual: screenshots at 1440x900 with the sidebar closed (5 columns) and open (3 columns, no overflow)

Success criteria: full chat works end to end in the container; AI board changes appear immediately and persist; all tests pass.
