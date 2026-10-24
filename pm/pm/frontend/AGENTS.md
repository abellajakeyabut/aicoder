# Frontend

A single Kanban board ("Kanban Studio"). Built as a static export (`output: "export"`, output in `out/`) and served by the FastAPI backend at `/` in the Docker image. A fake sign-in (`user` / `password`, checked in the browser) gates the board. The board is loaded from and saved to the backend (`/api/board`), so it persists. An AI chat sidebar (`/api/chat`) can change the board.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (via `@tailwindcss/postcss`), theme colors as CSS variables in `src/app/globals.css`
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop
- `clsx` for conditional class names
- Fonts: Space Grotesk (display) and Manrope (body) via `next/font/google`
- Tests: Vitest + Testing Library (jsdom) for unit tests, Playwright (Chromium) for e2e

## File map

- `next.config.ts` - static export for builds; under `next dev`, rewrites `/api/*` to the backend at `http://localhost:8000` (static export doesn't support rewrites, so this is dev only)
- `src/app/layout.tsx` - root layout, fonts, metadata
- `src/app/page.tsx` - client component; reads login state with `useSyncExternalStore` (null during prerender, so nothing renders until the client knows) and renders `LoginForm` or `KanbanBoard`
- `src/app/globals.css` - Tailwind import, color variables (`--accent-yellow`, `--primary-blue`, `--secondary-purple`, `--navy-dark`, `--gray-text`, plus surface/stroke/shadow)
- `src/lib/kanban.ts` - data model and pure helpers:
  - `Card { id, title, details }`, `Column { id, title, cardIds }`, `BoardData { columns, cards: Record<id, Card> }`
  - `initialData` - 5 columns (Backlog, Discovery, In Progress, Review, Done) and 8 sample cards; the backend seed `backend/app/default_board.json` is a copy, and e2e tests reset to it
  - `moveCard(columns, activeId, overId)` - reorder within a column or move across columns (drop on a card or on a column)
  - `createId(prefix)` - random id generator
- `src/lib/api.ts` - `fetchBoard()` (GET) and `saveBoard(board)` (PUT the whole board). Saves are chained on one promise so they reach the backend in order (column renames save on every keystroke); a failed save doesn't block later ones. `sendChat(message, history)` POSTs to `/api/chat` and returns `{reply, board}`
- `src/lib/auth.ts` - fake auth: `login(username, password)` (true and sets localStorage `pm-auth` for `user`/`password`), `logout()`, `isLoggedIn()`, `subscribe(listener)` for `useSyncExternalStore`
- `src/components/LoginForm.tsx` - sign-in card (username, password, error message, purple Sign in button)
- `src/components/KanbanBoard.tsx` - client component. Loads the board on mount ("Loading board..." until then). Every change (drag end, rename column, add, edit, delete card) builds the next board and calls `commit`, which sets state and saves. Owns the DnD context and drag overlay; the header has a Log out button. Layout is a flex row: `main` (a Tailwind `@container`, so the column grid follows the board width: 1, 3 at `@2xl`, 5 at `@6xl`) and `ChatSidebar`. A board from the AI is applied with `setBoard`, not `commit`, because the backend already saved it. The outer div uses `overflow-clip` (not `hidden`) so the sticky sidebar sticks
- `src/components/ChatSidebar.tsx` - collapsible AI chat. Closed: a fixed "Open AI chat" button. Open: a sticky full-height `aside` (`aria-label="AI chat"`) with user/assistant bubbles, "Thinking..." (`role="status"`), an error (`role="alert"`), a `Message` textarea (Enter sends, Shift+Enter new line), a purple Send button and a "Close chat" button. Conversation history lives in component state (kept while closed) and is sent with each message; on a returned board it calls `onBoardUpdate`
- `src/components/KanbanColumn.tsx` - droppable column with an editable title input (`aria-label="Column title"`), sortable card list, empty state and `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable card with Edit (`aria-label="Edit <title>"`) and Remove (`aria-label="Delete <title>"`) buttons. Edit opens an inline form (`Edit title`, `Edit details`, Save, Cancel). While editing, dnd-kit attributes and listeners are not applied, so the form isn't inside a (disabled) `role="button"`
- `src/components/KanbanCardPreview.tsx` - card rendered in the drag overlay
- `src/components/NewCardForm.tsx` - toggleable add-card form (title required, details optional)

Test ids: `column-<columnId>` and `card-<cardId>`.

## Tests

- `src/test/mockApi.ts` - stubs `fetch` (GET returns a copy of `initialData`, PUT echoes the body, `/api/chat` is answered by an optional handler); `savedBoards` / `lastSavedBoard` read the PUT bodies
- `src/lib/kanban.test.ts` - `moveCard`
- `src/lib/auth.test.ts` - auth helpers
- `src/lib/api.test.ts` - fetch, error responses, saves sent in order, saving continues after a failure
- `src/components/KanbanBoard.test.tsx` - loading then board from the API; rename, add, delete and edit each save the expected board; cancel edit doesn't save
- `src/components/ChatSidebar.test.tsx` - user message, loading, reply and history sent; an AI board updates the cards without a PUT; error shown; conversation kept when closed and reopened; Enter sends
- `src/app/page.test.tsx` - login gate: login form first, wrong credentials error, login, already logged in, logout
- `tests/helpers.ts` - Playwright helpers: `login`, `resetBoard` (PUT `initialData`), `dragTo`
- `tests/auth.spec.ts` - login form first, wrong password, login persists on reload, logout
- `tests/kanban.spec.ts` - board loads, add card, edit card, drag card between columns
- `tests/persistence.spec.ts` - rename, add, edit and move, then reload and check all are kept
- `tests/chat.spec.ts` - `/api/chat` is answered in the browser with `page.route` (no AI calls, no OpenRouter cost): the AI adds a card and it appears without a reload; the board fits beside the open sidebar

Next.js renders an empty `role="alert"` route announcer, so filter `getByRole("alert")` by text in e2e tests.

Commands: `npm run build` (static export to `out/`), `npm run test:unit`, `npm run test:e2e`, `npm run test:all`, `npm run lint`, `npx tsc --noEmit`.

E2E tests need the backend running (start the container with `scripts/start.*`), because they use and reset the stored board. They run with one worker, since they share that board.
- Against the container: set `BASE_URL=http://localhost:8000`, then `npx playwright test` (no dev server is started).
- Against `next dev`: `npm run test:e2e` (starts `next dev` on 127.0.0.1:3000, which proxies `/api` to the container).

## Notes

- Static export means no Next.js server features (API routes, server actions, dynamic SSR); all data comes from the FastAPI `/api` routes.
- Tests never call the real AI: unit tests use `mockApi`, e2e tests use `page.route` for `/api/chat`.
