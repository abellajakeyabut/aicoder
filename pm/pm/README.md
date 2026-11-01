# Project Management App

Kanban boards with an AI chat sidebar. Users sign up, own any number of boards, and plan with cards that have a priority and a due date. FastAPI backend serving a static Next.js frontend, in one Docker container.

## Run

Docker must be running. Put `OPENROUTER_API_KEY` in `.env` for the AI chat.

- Start: `scripts/start.sh` (Mac, Linux) or `scripts/start.ps1` (PC), then open http://localhost:8000
- Stop: `scripts/stop.sh` or `scripts/stop.ps1`

Create an account, or sign in with the demo account `user` / `password`.

## Test

- Backend: `scripts/test-backend.sh` (runs pytest in a Python 3.14 container; add `--cov=app` for coverage)
- Frontend unit: `cd frontend && npm run test:unit` (`npx vitest run --coverage` for coverage)
- End to end: start the app, then `cd frontend && BASE_URL=http://localhost:8000 npx playwright test`

## Security

Passwords are hashed with scrypt and sessions are HttpOnly cookies. There is no HTTPS, rate limiting or CSRF token, and the demo account is always present, so run it locally only.

## More

Plan and design: `docs/`. Backend and frontend notes: `backend/AGENTS.md`, `frontend/AGENTS.md`.
