# Frontend

"Kanban Studio": users sign in or create an account, keep several Kanban boards, and plan with cards that have a priority and a due date. An AI chat sidebar can change the open board. Built as a static export (`output: "export"`, output in `out/`) and served by the FastAPI backend at `/` in the Docker image. All data comes from the backend `/api` routes; the session is an HttpOnly cookie.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (via `@tailwindcss/postcss`), theme colors as CSS variables in `src/app/globals.css`
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop
- `clsx` for conditional class names
- `lucide-react` for icons (icon-only buttons keep an `aria-label`)
- Fonts: Space Grotesk (display) and Manrope (body) via `next/font/google`
- Tests: Vitest + Testing Library (jsdom) for unit tests, Playwright (Chromium) for e2e

## File map

- `next.config.ts` - static export for builds; under `next dev`, rewrites `/api/*` to the backend at `http://localhost:8000` (dev only)
- `src/app/page.tsx` - checks the session with `getMe()` on mount (renders nothing until it returns, an error if the server is unreachable), then renders `AuthForm` or `AppShell`
- `src/lib/kanban.ts` - data model and pure helpers:
  - `Card { id, title, details, priority: "low" | "medium" | "high" | null, dueDate: "YYYY-MM-DD" | null }`, `Column { id, title, cardIds }`, `BoardData { columns, cards }`
  - `initialData` - 4 columns and 8 sample cards; the backend seed `backend/app/default_board.json` is a copy
  - `moveCard(columns, activeId, overId)`, `createId(prefix)`, `today()` (local date), `isOverdue(card, day)`, `formatDueDate(date)` ("Nov 7")
- `src/lib/api.ts` - one `request` helper (JSON, throws `ApiError {status, message}` using the server's `detail`). Auth: `getMe` (null when signed out), `login`, `register`, `logout`, `changePassword`, `deleteAccount`. Boards: `listBoards`, `createBoard`, `renameBoard`, `deleteBoard`, `fetchBoard(id)`, `saveBoard(id, board)` (saves are chained so they reach the backend in order; a failed save doesn't block later ones), `sendChat(id, message, history)` (waits for pending saves first)
- `src/components/ui.tsx` - shared class names (inputs, labels, buttons, errors) and the background glow
- `src/components/AuthForm.tsx` - sign-in card with Sign in / Create account tabs; explains bad credentials, taken usernames and the username and password rules
- `src/components/AppShell.tsx` - signed-in layout: `BoardSidebar`, the open board (`KanbanBoard`, keyed by board id so switching starts fresh) and `AccountDialog`. Loads the board list, opens the board remembered in localStorage `pm-board-<userId>` (or the first), creates, renames and deletes boards (delete asks `window.confirm`; deleting the open board opens the next), keeps the card counts current via `KanbanBoard.onChange`, and shows an empty state when there are no boards. Board request errors show as an alert
- `src/components/BoardSidebar.tsx` - left `nav` (`aria-label="Boards"`, 256px, sticky): board list with card counts (the open one has `aria-current="page"`), New board, inline Rename (Enter saves, Escape cancels) and Delete icons on hover, and the account footer (username, Account settings, Log out). "Collapse sidebar" shrinks it to a 64px rail (board initials labelled with their names, New board expands it again); not remembered across reloads
- `src/components/AccountDialog.tsx` - modal: change password (explains a wrong current password or a short new one), delete account with a confirm step; Escape or Close closes it
- `src/components/KanbanBoard.tsx` - one board (`boardId`, `name`, `onChange`). Loads it on mount; every change calls `commit`, which sets state, reports to `onChange` and saves. A failed save shows an error until the next save succeeds. Header: board name, Cards / High priority / Overdue totals (cards in the last column count as finished, never overdue) and "Open AI chat". Columns are one row (`grid-flow-col`, `minmax(210px, 1fr)`, four fit beside the sidebar at 1440px) that scrolls sideways inside itself when narrower. A board from the AI is applied with `setBoard` (the backend already saved it). While the AI works the board is locked: cards can't be dragged (`locked` disables `useSortable`) and the controls sit in a disabled `fieldset` (`display: contents`)
- `src/components/ChatSidebar.tsx` - AI chat for `boardId`: bubbles, "Thinking...", errors with retry, Enter sends; history lives in component state
- `src/components/KanbanColumn.tsx` - droppable column, editable title (blank restores the old one), count badge, cards, `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable card with Edit and Delete icon buttons; Edit opens an inline form (`Edit title`, `Edit details`, `Priority` select, `Due date` input)
- `src/components/CardMeta.tsx` - priority and due date badges (overdue dates are purple, with "Overdue, due Nov 3" for screen readers)
- `src/components/KanbanCardPreview.tsx` - card in the drag overlay
- `src/components/NewCardForm.tsx` - toggleable add-card form

Test ids: `column-<columnId>` and `card-<cardId>`.

## Tests

- `src/test/mockApi.ts` - an in-memory fake of the backend behind a stubbed `fetch`: the demo user (`user` / `password`, signed in unless `{ user: null }`), board 1 "My first board" with `initialData`, and every auth and board route; chat is answered by an optional handler. Helpers: `savedBoards`, `lastSavedBoard`, `requests` ("METHOD url" list)
- Unit tests sit next to the code: `api.test.ts`, `kanban.test.ts`, `page.test.tsx` (sign in, create account, errors, log out), `AppShell.test.tsx` (board list, create, switch, remember, rename, delete, empty state, counts, errors, account dialog), `AccountDialog.test.tsx`, `KanbanBoard.test.tsx` (load, save, totals, overdue with a faked date, priority and due date editing), `ChatSidebar.test.tsx`
- Coverage: `npx vitest run --coverage` (scoped to `src`, about 97% of statements)
- `tests/helpers.ts` - Playwright `test` with an automatic `account` fixture: every test registers its own new user through the API (the page shares the cookie), opens `/`, and deletes the account afterwards. So tests are independent and run in parallel. Also `signIn`, `boardsNav`, `boardLink`, `storedBoards`, `storedBoard`, `dragTo`
- `tests/auth.spec.ts` - sign-in first, wrong password, demo user, create account then reload, log out and in, taken username, change password, delete account, users only see their own boards
- `tests/boards.spec.ts` - create, add a card, switch, rename, remember across reload, delete; dismissed delete; empty state
- `tests/kanban.spec.ts` - load, add, edit with priority and due date, overdue marking and count, drag, delete
- `tests/persistence.spec.ts` - rename, add, edit and move, then reload
- `tests/chat.spec.ts` - `/api/boards/*/chat` is answered in the browser with `page.route` (no AI calls): an AI card appears without a reload; fits beside the sidebar; board locked while the AI works
- `tests/layout.spec.ts` - at 1440x900, four columns fit beside the sidebar in one row; with the chat open they scroll sideways; collapsing the sidebar widens them; icon buttons

Next.js renders an empty `role="alert"` route announcer, so filter `getByRole("alert")` by text in e2e tests. In Chromium the board `header` has no banner role (it is inside `main`), so find header stats by their label text.

Commands: `npm run build`, `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npx tsc --noEmit`.

E2E tests need the backend running (`scripts/start.*`):
- Against the container: `BASE_URL=http://localhost:8000 npx playwright test` (no dev server is started)
- Against `next dev`: `npm run test:e2e` (starts `next dev` on 127.0.0.1:3000, which proxies `/api` to the container)

## Notes

- Static export means no Next.js server features; all data comes from the FastAPI `/api` routes.
- Tests never call the real AI: unit tests use `mockApi`, e2e tests use `page.route` for the chat route.
