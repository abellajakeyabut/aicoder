# Kanban MVP Plan

## Context
Greenfield project: only `AGENTS.md` exists. Build a single-board Kanban MVP web app in `frontend/`, per AGENTS.md: 5 fixed, renamable columns; cards with title + details; add/delete cards; drag and drop between columns; dummy data on load; no persistence. Polished UI using primary green `#097969` and accent white `#E6FFE6`. Keep it simple, no emojis, minimal README.

Environment: Node 24.14.0, npm 12.1.0 (prints an engine warning but works; if installs fail, fall back to `npx npm@11`). Not yet a git repo.

## Stack (latest versions at install time)
- Vite + React 19 + TypeScript (`npm create vite@latest frontend -- --template react-ts`)
- Tailwind CSS v4 via `@tailwindcss/vite`, with theme tokens for the two brand colors
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop (reorder within a column, move across columns)
- State: `useReducer` in `App`, no state library
- Unit tests: Vitest + React Testing Library + jsdom + `@testing-library/user-event`
- E2E: Playwright (Chromium)

## Structure
```
.gitignore                 node_modules, dist, coverage, playwright-report, test-results, .env
README.md                  minimal: what it is, how to run, how to test
frontend/
  src/
    main.tsx, App.tsx, index.css
    board/
      types.ts             Card, Column, BoardState
      initialData.ts       5 columns (Backlog, To Do, In Progress, Review, Done) with ~10 realistic cards
      boardReducer.ts      actions: renameColumn, addCard, deleteCard, moveCard
      boardReducer.test.ts
    components/
      Board.tsx            DndContext, sensors, DragOverlay, onDragOver/onDragEnd -> moveCard
      Column.tsx           header with inline rename (click to edit, Enter/blur saves, Esc cancels), card list, add-card button
      Card.tsx             sortable card: title, details, delete button (shown on hover/focus)
      AddCardForm.tsx      inline title + details form, Enter submits, Esc cancels
      *.test.tsx           component tests
  e2e/board.spec.ts
  playwright.config.ts     webServer runs `npm run dev`
  vite.config.ts           react + tailwind plugins, vitest config (jsdom, setup file)
```

## Phases and success criteria

### Phase 1: Scaffolding
- [x] `git init` at repo root, root `.gitignore` created
- [x] Vite React TS app in `frontend/`, boilerplate removed
- [x] Tailwind v4, dnd-kit, Vitest/RTL, Playwright installed
- [x] Scripts: `dev`, `build`, `test`, `test:e2e`, `lint`
- [x] `npm run build` and `npm run lint` pass

### Phase 2: Data model and reducer
- [x] Types and dummy data (5 columns, cards spread across them)
- [x] Reducer handles rename, add, delete, move (same column reorder and cross column, including into empty column)
- [x] Unit tests cover every action and edge cases (move to end, move into empty column, rename to blank keeps old name)

### Phase 3: UI components
- [x] Board renders 5 columns side by side with horizontal scroll on narrow screens
- [x] Column header shows name and card count; inline rename works
- [x] Add card form (title required, details optional); delete card button
- [x] Drag and drop with pointer and keyboard sensors, drag overlay with lift/shadow, drop placeholder
- [x] Design: clean header bar, `#097969` for accents/borders/focus rings/buttons, `#E6FFE6` for column backgrounds and key sections, soft shadows, rounded corners, smooth transitions, Inter (or system) font
- [x] Component tests: render with dummy data, rename, add, delete, cancel flows

### Phase 4: Integration testing (Playwright)
- [x] App loads with 5 columns and dummy cards
- [x] Rename a column
- [x] Add a card, delete a card
- [x] Drag a card to another column and reorder within a column (mouse)
- [x] All defects found are fixed; `npm test` and `npm run test:e2e` green

### Phase 5: Finish
- [x] Minimal README (no emojis)
- [x] Visual check via Playwright screenshot, polish any rough spots
- [x] Dev server started and left running, URL given to user

## Verification
- `cd frontend && npm run lint && npm test && npm run build`
- `npm run test:e2e` (Playwright starts dev server)
- Screenshot of the board reviewed for visual quality
- `npm run dev` running in background at http://localhost:5173
