# Code Review

Date: 2026-10-24. Scope: the whole `pm/pm` project (backend, frontend, Docker, scripts, tests, docs).

The code is in good shape overall: small, readable, consistent with `AGENTS.md`, with useful comments explaining non-obvious decisions. The issues below are ordered by severity. Tests, type checks and lint were not run as part of this review; findings come from reading the code. All findings have since been resolved (see the Resolved notes); 42 frontend unit tests and 26 backend tests pass, with tsc and eslint clean.

## Summary of actions

| # | Severity | Area | Action |
|---|----------|------|--------|
| 1 | High | Frontend / AI | Prevent lost edits when the board changes while a chat request is in flight (done) |
| 2 | High | Frontend / AI | Wait for pending saves before sending a chat message (done) |
| 3 | High | Repo | Stop tracking `__pycache__` files; add a project `.gitignore` (done) |
| 4 | Medium | Backend / AI | Enforce fixed columns on boards returned by the AI (done) |
| 5 | Medium | Frontend | Store empty details as `""`, not the placeholder text (done) |
| 6 | Medium | Frontend | Handle board load and save failures (done) |
| 7 | Medium | Backend / AI | Map OpenRouter and parse errors to 502 (done) |
| 8 | Low | Backend | Remove the `/api/ai/test` endpoint (done) |
| 9 | Low | Frontend | Drop the failed user message from chat history on error (done) |
| 10 | Low | Frontend | Prevent empty column titles (done) |
| 11 | Low | Docker | Pin the `uv` image version (done) |
| 12 | Low | Frontend | Simplify `moveCard` and add unit tests for its branches (done) |
| 13 | Low | Repo | Remove the stray root `package-lock.json` and tidy `package.json` scripts (done) |
| 14 | Info | Security | Document that the API is unauthenticated (done) |

## Findings

### 1. Edits made during a chat request are silently lost (High)

`frontend/src/components/KanbanBoard.tsx:203`, `backend/app/main.py:49-62`

`/api/chat` reads the board from the database at the start of the request, then the AI takes several seconds. If the user drags, adds, edits or renames anything in the meantime, those changes are saved by `PUT /api/board`. When the chat returns, the backend saves the AI board (built from the old board) over them, and the frontend calls `setBoard` with it. The user's changes disappear without any message.

Action: the simplest fix is to block board edits while the chat is loading (lift `loading` into `KanbanBoard`, or pass a `disabled` flag to the board). An alternative is to have the frontend send its current board in the chat request and reject the AI result if the stored board changed, but that is more code. Add a unit test for whichever approach is chosen.

Resolved: `KanbanBoard` owns the chat loading flag and passes it to `ChatSidebar`. While a request is in flight the DnD sensors are removed and the columns are wrapped in a disabled `fieldset` (rename, edit, delete and add are disabled, the board is dimmed). Test: `ChatSidebar.test.tsx` "locks the board while the AI is working".

### 2. Chat can act on a stale board (High)

`frontend/src/lib/api.ts:14-27`, `frontend/src/components/ChatSidebar.tsx:37`

Saves are chained in `pendingSave`, but `sendChat` does not wait for them. If the user makes a change and sends a chat message straight away (column renames save on every keystroke, so this is easy), the backend may read the board before the last PUT lands. The AI then works on, and saves, an older board. A queued PUT can also land after the AI save and overwrite it in the database while the UI shows the AI board.

Action: in `sendChat`, `await pendingSave.catch(() => {})` before the POST. Together with action 1 this removes both orderings of the race.

Resolved: `sendChat` awaits `pendingSave` before posting; a failed save does not block the chat. With the board locked during chat (action 1), no save can be queued behind the AI save. Tests in `api.test.ts`: "sends a chat message only after pending saves finish" (verified to fail without the fix) and "sends a chat message after a failed save".

### 3. Compiled Python files are committed (High)

`backend/app/__pycache__/*.pyc`, `backend/tests/__pycache__/*.pyc` are tracked. There is no `.gitignore` in `pm/pm`; the parent repo's `.gitignore` covers `node_modules` and `.env` but not `__pycache__`, `.venv`, `.pytest_cache` or `backend/static`, which `docs/PLAN.md` says are gitignored.

Action:
- Add `pm/pm/.gitignore` with `__pycache__/`, `.venv/`, `.pytest_cache/`, `backend/static/`, `*.db`.
- `git rm -r --cached backend/app/__pycache__ backend/tests/__pycache__`.
- Separately, the parent repo tracks `aicoder/frontend/node_modules` (it shows as modified in `git status`). That belongs to the other project but bloats this repository; untrack it too.

Resolved: added `pm/pm/.gitignore` (`.env`, `__pycache__/`, `.venv/`, `.pytest_cache/`, `backend/static/`, `*.db`) and removed from the index (files kept on disk) the 10 `.pyc` files and the 4820 files under `aicoder/frontend/node_modules`, which the parent `.gitignore` already ignores. The removals are staged, not committed.

### 4. Fixed columns are not enforced (Medium)

`backend/app/main.py:57-61`, `backend/app/models.py:28-39`

The requirement is fixed columns that can only be renamed. The system prompt asks the AI not to add or remove columns, but nothing checks it: an AI board with 4 or 6 columns, or with changed column ids, passes `Board` validation and is saved. The same applies to `PUT /api/board`.

Action: in `chat_with_ai`, compare column ids with the current board and return 502 if they differ:

```python
current = get_board(USERNAME)
...
if [c.id for c in board.columns] != [c.id for c in current.columns]:
    raise HTTPException(status_code=502, detail="The AI changed the columns")
```

Add a mocked test alongside `test_invalid_board_is_not_saved`.

Resolved: `chat_with_ai` compares the AI board's column ids (and their order) with the stored board and returns 502 without saving if they differ; renames still go through. Tests in `test_chat.py`: `test_changed_columns_are_not_saved` (removed, added, reordered; verified to fail without the fix) and `test_renamed_column_is_saved`. `PUT /api/board` is left as is, since the frontend never changes columns.

### 5. Placeholder text is stored as card details (Medium)

`frontend/src/components/KanbanBoard.tsx:81`, `:96`

`handleAddCard` and `handleEditCard` save `"No details yet."` when details are empty. That is display text stored as data: editing such a card shows "No details yet." in the textarea as real content, it is sent to the AI as the card's details, and cards created by the AI (which uses `""` per the system prompt) render with no placeholder at all. Behaviour is inconsistent depending on who created the card.

Action: store `details` as given (`""` allowed) and render the placeholder in `KanbanCard` and `KanbanCardPreview` when `card.details` is empty.

Resolved: `handleAddCard` and `handleEditCard` store details as entered; `KanbanCard` and `KanbanCardPreview` show "No details yet." when details are empty, so AI-created cards get it too. Tests in `KanbanBoard.test.tsx`: "saves empty details as empty and shows a placeholder" and "clears details on edit without storing the placeholder" (both verified to fail on the old code). The stored board in the running container had no placeholder values to clean up.

### 6. Load and save failures are unhandled (Medium)

`frontend/src/components/KanbanBoard.tsx:31-33`, `:43-46`

- `fetchBoard().then(setBoard)` has no rejection handler. If the backend is down the page shows "Loading board..." forever, with an unhandled promise rejection in the console.
- `commit` ignores the promise from `saveBoard`. A failed save produces an unhandled rejection and the user believes the change was stored.

Action: keep it minimal. Add an `error` state, set it in `.catch` for both, and show one line such as "Could not reach the server. Changes may not be saved." in the header, styled like the existing chat error. Add unit tests using `mockApi`.

Resolved: a failed load shows "Could not load the board..." instead of loading forever; a failed save shows an error in the header that clears after the next successful save (each save sends the whole board). No more unhandled rejections from `commit`. Tests in `KanbanBoard.test.tsx`.

### 7. Upstream AI errors return 500 (Medium)

`backend/app/ai.py:70-78`, `backend/app/main.py:51`

Only `None` results and invalid boards are mapped to 502. These still surface as 500: a missing `OPENROUTER_API_KEY` (`KeyError`), network or rate-limit errors (`openai.APIError`), invalid JSON from the model (pydantic `ValidationError` raised inside `parse`), and `LengthFinishReasonError`. The frontend shows the same generic message either way, so this matters mainly for logs and correctness of status codes.

Action: wrap the `chat(...)` call in `except (openai.OpenAIError, ValidationError)` and raise 502. Leave the missing key as a startup-visible 500 or check it once in `lifespan` with a clear log message; do not add more than that.

Resolved: `chat_with_ai` maps `OpenAIError` (which includes `APIError` and `LengthFinishReasonError`) and pydantic `ValidationError` from the call to 502. A missing key still raises `KeyError` (500), as suggested. Test: `test_ai_failure_is_a_bad_gateway` in `test_chat.py`.

### 8. Leftover connectivity endpoint (Low)

`backend/app/main.py:44-46`, `backend/app/ai.py:54-58`

`POST /api/ai/test` was a Part 2 check. It is unauthenticated and costs money on every call. Under "no extra features" it, `ask()`, and `tests/test_ai.py` can be removed; `test_live_question_returns_no_board` already covers connectivity.

Resolved: removed the endpoint, `ask()` and `tests/test_ai.py`; `docs/PLAN.md` notes the removal.

### 9. Failed chat messages stay in history (Low)

`frontend/src/components/ChatSidebar.tsx:31-46`

On error the user message stays in `messages` with no reply. The next send includes it in `history`, so the AI sees two consecutive user messages, one of which may have asked for a change that never happened. The system prompt says earlier requests are already applied, which is then false.

Action: on error, restore the previous messages (`setMessages(history)`) and put the text back in the input (`setInput(message)`), so the user can retry.

Resolved: on error the previous messages are restored and the text goes back in the input. Test: "shows an error when the request fails and lets the user retry" checks the retry is sent with an empty history.

### 10. Columns can be renamed to an empty title (Low)

`frontend/src/components/KanbanColumn.tsx:44-49`

Clearing the input saves an empty title, leaving an unlabeled column in both the header pills and the board. Action: on blur, if the title is blank, restore a default (for example the previous non-empty title kept in local state). Keep the per-keystroke save; it is a documented decision.

Resolved: the title is remembered on focus and restored on blur if left blank. Test: "restores the previous title when a column is left blank".

### 11. Unpinned build image (Low)

`Dockerfile:9`

`ghcr.io/astral-sh/uv:latest` makes builds non-reproducible. Pin a version tag that matches the lock file's uv version. The container also runs as root; acceptable for a local MVP, no action needed.

Resolved: pinned to `ghcr.io/astral-sh/uv:0.9.30`.

### 12. `moveCard` has redundant branches and thin tests (Low)

`frontend/src/lib/kanban.ts:84-162`, `frontend/src/lib/kanban.test.ts`

`activeColumn` / `overColumn` cannot be undefined once `findColumnId` returned their ids, and `activeIndex === -1` cannot happen for the same reason, so lines 99-101 and 137-139 are dead code. The function has six paths (same column to column, same column reorder, no-op, cross column onto card, cross column onto empty column, unknown id) and the test file is 25 lines.

Action: remove the dead checks and add a table-driven test covering each path. This is the core board logic and is worth the coverage.

Resolved: `moveCard` is now one pass (remove the card everywhere, insert it into the target column), down from about 80 lines to about 25. The new table-driven tests (every move path, unknown ids, ids and titles kept) pass against both the old and new code, so behaviour is unchanged.

### 13. Repo and config tidy-ups (Low)

- `pm/pm/package-lock.json` (81 bytes) is a stray empty lock file from running npm in the wrong directory. Delete it.
- `frontend/package.json`: `test` and `test:unit` are identical; keep one. `@types/node` is `^20` while the Docker build uses Node 24; bump to `^24`.
- `frontend/public/*.svg` are unused create-next-app assets; delete them.
- Chat message list uses the array index as `key` (`ChatSidebar.tsx:107`). Fine here since messages are only appended; no action.

Resolved: deleted the root `package-lock.json` and the unused `public/*.svg` files; removed the duplicate `test` script (docs use `test:unit`); bumped `@types/node` to `^24`.

### 14. API is unauthenticated (Info)

Sign-in is a localStorage flag checked in the browser (`frontend/src/lib/auth.ts`), and every API route acts as `user`. Anyone who can reach port 8000 can read and replace the board or spend AI credit. This matches the documented MVP decision and the app runs locally, so no change is required now. Action: state it in the README so it is not mistaken for real auth, and note in `docs/PLAN.md` that real sign-in must add a backend check before the app is exposed beyond localhost.

Resolved: added a minimal root `README.md` with run steps and a Security section, and noted in `docs/PLAN.md` that real sign-in needs a backend check before the app is exposed beyond localhost.

## What is working well

- Backend `Board` validation is tight (extra fields forbidden, unique ids, every card in exactly one column) and rejects bad AI output before saving.
- Good separation: `db.py`, `ai.py`, `models.py`, `main.py` are each small and single-purpose. stdlib `sqlite3` with an upsert is the right level of simplicity.
- The AI integration is thoughtful: Structured Outputs with a list-based `AIBoard`, the board placed after the history to avoid re-applied changes, and provider routing with the reason documented.
- Tests mock the AI by default and keep live calls behind a key check. Per-test temp databases and the stub static dir keep backend tests isolated.
- Frontend uses `useSyncExternalStore` correctly for localStorage auth with a static export, and the ordered save queue is a simple, correct way to keep keystroke saves in order.
- Scripts are short and symmetric across platforms; the Dockerfile is a clean two-stage build with no Node at runtime.
- `AGENTS.md` files and `docs/PLAN.md` accurately describe the code.

## Suggested order

1. Actions 1 and 2 together (data loss), with tests.
2. Action 3 (repo hygiene, quick).
3. Actions 4 to 7.
4. The low-severity items as one cleanup commit.
