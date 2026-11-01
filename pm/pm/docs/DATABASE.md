# Database

## Approach

- SQLite, one file at `/data/app.db` inside the container (override with the `DB_PATH` env var; tests use a temp file).
- `/data` is the `pm-data` Docker volume, so data survives container restarts.
- Accessed with Python's stdlib `sqlite3`. No ORM. Foreign keys are on, so deleting a user deletes their sessions and boards.
- Each board is stored as one JSON document in the frontend `BoardData` shape (`frontend/src/lib/kanban.ts`). The formal shape is in `board-schema.json`.

## Schema (version 1, `PRAGMA user_version = 1`)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL      -- "<salt hex>$<scrypt hex>"
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,          -- random, sent as the HttpOnly "session" cookie
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE boards (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL,              -- BoardData JSON
  created_at TEXT NOT NULL,        -- ISO 8601 UTC
  updated_at TEXT NOT NULL
);
CREATE INDEX boards_user ON boards(user_id);
```

## Why a JSON blob per board

- Matches the frontend shape exactly, so no mapping code.
- The API reads and replaces a whole board (`GET` / `PUT /api/boards/{id}`), and the AI returns whole boards.
- Card order is array order, so there are no position columns to maintain.
- Trade-off: no SQL queries over individual cards. Board summaries parse the JSON to count cards, which is fine at this size.

## Board rules

Checked by the backend (Pydantic) before saving:

- Column ids are unique.
- Each key in `cards` equals that card's `id`.
- Every id in `columns[].cardIds` exists in `cards`, and each card appears in exactly one column.
- A card's `priority` is `low`, `medium`, `high` or null; `dueDate` is a `YYYY-MM-DD` date or null. Both are optional, so older boards still load.

## Lifecycle

1. App startup: create the db file and tables if missing. A version 0 (Part 6) database, with one board per user and no passwords, is migrated in place: its board is kept and named "My board".
2. The demo user `user` / `password` is created on startup if missing (a migrated `user` gets that password).
3. Registering creates the user and one board, "My first board", seeded from `backend/app/default_board.json`.
4. New boards get the five default columns and no cards.
