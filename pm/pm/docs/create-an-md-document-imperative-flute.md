# Plan: Remove the "Review" column

## Context

You want to drop "Review" from the board. The board goes from 5 fixed columns (Backlog, Discovery, In Progress, Review, Done) to 4 (Backlog, Discovery, In Progress, Done). Decisions already made:
- The sample card in Review (`card-6`, "QA micro-interactions") moves to the end of In Progress.
- Boards already saved in SQLite get a one-time migration, so existing users (local `pm-data` volume, the Pi) lose Review too.

Step 1 of the work is to save this plan as `docs/REMOVE_REVIEW.md` (you asked for it in docs/). Plan mode only lets me write this file, so that copy happens first once you approve.

## Steps

### 1. Save the plan document
- [ ] Write this plan, with checkboxes, to `docs/REMOVE_REVIEW.md`.

### 2. Seed data (frontend and backend stay identical)
- [ ] `frontend/src/lib/kanban.ts`: remove the `col-review` entry from `initialData.columns`. `col-progress` becomes `["card-4", "card-5", "card-6"]`.
- [ ] `backend/app/default_board.json`: make the same change. It must stay an exact copy of `initialData` (`frontend/AGENTS.md` says so).

### 3. Migrate saved boards (`backend/app/db.py`)
- [ ] Set `SCHEMA_VERSION = 2`.
- [ ] In `init_db`, before setting `user_version`: if `version < 2`, go through every `boards` row. Load `data`, take out the column with id `col-review`, append its `cardIds` to `col-progress`, and write the board back. Use plain `json`. Rows without `col-review` are left alone (this covers new boards and boards migrated from v0 in the same startup).
- [ ] No other backend changes. `Board` validation does not fix the column count, and the AI chat check (`main.py:169`) compares against the board's current columns, so it works with 4.

### 4. Tests
- [ ] `backend/tests/test_boards.py`: `len(board["columns"]) == 5` becomes `4`. In `test_put_then_get_returns_saved_board`, `board["columns"][4]` (Done) becomes `[3]`, or `[-1]`.
- [ ] `backend/tests/test_chat.py`: update the `remove_column` comment ("Move the Done cards to In Progress").
- [ ] `backend/tests/test_migration.py`: add a test that seeds a v1 database with a board containing Review (copy `DEFAULT`, put the old Review column back with `card-6`, remove `card-6` from In Progress). After startup, check that the board has 4 columns, no `col-review`, a renamed column title kept, `card-6` last in In Progress, and `PRAGMA user_version == 2`. Update the existing Part 6 test so it expects `user_version == 2`.
- [ ] `frontend/src/components/KanbanBoard.test.tsx:208`: update the comment (card-6 is now in In Progress). The overdue assertions stay as they are.
- [ ] `frontend/tests/kanban.spec.ts:45-46`: drag `card-1` to `column-col-progress` instead of `column-col-review`.
- [ ] `frontend/tests/layout.spec.ts`: update any count or wording that assumes five columns.

### 5. Docs
- [ ] `frontend/AGENTS.md`: change "5 columns" to "4 columns" and "five fit/five columns" to "four".
- [ ] `docs/DATABASE.md:57`: change "five default columns" to "four", and add a line about schema version 2 (Review removed, its cards moved to In Progress).

## Verification

- [ ] `scripts/test-backend.sh` passes, including the new migration test.
- [ ] Frontend unit tests (`npm test`), `tsc` and `eslint` are clean in `frontend/`.
- [ ] Playwright e2e (`npx playwright test`) passes.
- [ ] Manual check: `scripts/start.sh` against the existing `pm-data` volume. Sign in as user/password and confirm the board shows 4 columns, `card-6` is in In Progress, and any renamed column titles are kept.
- [ ] `grep -rni "col-review"` over the source finds nothing (except the migration code and its test).
