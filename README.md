# Kanban

A single-board Kanban app built with React, Vite, Tailwind CSS and dnd-kit. Five renamable columns, cards with a title and details, drag and drop between columns. Data lives in memory and resets on reload.

## Run

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Test

```
npm test              # unit and component tests (Vitest)
npx playwright install chromium
npm run test:e2e      # end-to-end tests (Playwright)
```
