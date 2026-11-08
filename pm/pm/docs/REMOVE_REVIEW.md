# Plan: Remove the "Review" column

## Context

The board goes from 5 fixed columns (Backlog, Discovery, In Progress, Review, Done) to 4 (Backlog, Discovery, In Progress, Done).

- The sample card in Review (`card-6`, "QA micro-interactions") moves to the end of In Progress.
- Boards already saved in SQLite get a one-time migration: the Review column is removed and its cards are appended to In Progress. No other data changes (users, sessions, board names, renamed column titles and cards are kept).

## Steps

### 1. Back up existing data
- [x] Local: `docker cp pm-app:/data/app.db ./app.db.bak` before the first start with the new code.
- [ ] Pi: run the same command on the Pi before loading the new image there.

### 2. Seed data (frontend and backend stay identical)
- [x] `frontend/src/lib/kanban.ts`: remove `col-review` from `initialData.columns`; `col-progress` becomes `["card-4", "card-5", "card-6"]`.
- [x] `backend/app/default_board.json`: same change, an exact copy of `initialData`.

### 3. Migrate saved boards (`backend/app/db.py`)
- [x] `SCHEMA_VERSION = 2`.
- [x] In `init_db`, when `version < 2`: for every `boards` row, remove the `col-review` column and append its `cardIds` to `col-progress`. Rows without `col-review` are left alone.
- [x] No other backend changes: `Board` validation does not fix the column count, and the AI chat check compares against the board's current columns.

### 4. Tests
- [x] `backend/tests/test_boards.py`: expect 4 columns; Done is `columns[3]`.
- [x] `backend/tests/test_chat.py`: update the `remove_column` comment.
- [x] `backend/tests/test_migration.py`: new test for a v1 database with a Review column (4 columns after startup, renamed title kept, `card-6` last in In Progress, `user_version == 2`); Part 6 test expects `user_version == 2`.
- [x] `frontend/src/components/KanbanBoard.test.tsx`: update the card-6 comment.
- [x] `frontend/tests/kanban.spec.ts`: drag to `column-col-progress` instead of `column-col-review`.
- [x] `frontend/tests/layout.spec.ts`: update anything that assumes five columns.

### 5. Docs
- [x] `frontend/AGENTS.md`: 5/five columns becomes 4/four.
- [x] `docs/DATABASE.md`: four default columns; note schema version 2.

## Verification

- [x] `scripts/test-backend.sh` passes, including the new migration test.
- [x] Frontend unit tests, `tsc` and `eslint` are clean.
- [x] Playwright e2e passes.
- [x] Manual check: after the backup, `scripts/start.sh` against the existing `pm-data` volume shows 4 columns, `card-6` in In Progress, renamed titles kept.
- [x] `col-review` appears only in the migration code and its test.
