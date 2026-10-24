# Database

## Approach

- SQLite, one file at `/data/app.db` inside the container (override with the `DB_PATH` env var; tests use a temp file).
- `/data` is the `pm-data` Docker volume, so data survives container restarts.
- Accessed with Python's stdlib `sqlite3`. No ORM.
- Each user's board is stored as one JSON document in the frontend `BoardData` shape (`frontend/src/lib/kanban.ts`). The formal shape is in `board-schema.json`.

## Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  data TEXT NOT NULL,        -- BoardData JSON
  updated_at TEXT NOT NULL   -- ISO 8601 UTC
);
```

- `UNIQUE(user_id)` enforces one board per user for the MVP. Dropping it allows multiple boards later.
- No password column: sign-in is checked in the browser for the MVP. Add one when real auth is needed.

## Why a JSON blob

- Matches the frontend shape exactly, so no mapping code.
- The API reads and replaces the whole board (`GET` / `PUT /api/board`).
- The AI (Part 9) returns whole boards.
- Card order is array order, so there are no position columns to maintain.
- Trade-off: no SQL queries over individual cards. The MVP doesn't need them.

## Board rules

Checked by the backend (Pydantic) before saving:

- Column ids are unique.
- Each key in `cards` equals that card's `id`.
- Every id in `columns[].cardIds` exists in `cards`.
- Each card appears in exactly one column.

## Lifecycle

1. App startup: create the db file and tables if missing.
2. `GET /api/board`: if user `user` or their board doesn't exist, create them, with the default board (5 columns, 8 cards, the same as the frontend `initialData`) stored in `backend/app/default_board.json`.
3. `PUT /api/board`: validate, then replace `data` and set `updated_at`.

The backend acts as the fixed user `user` for the MVP.
