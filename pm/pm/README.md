# Project Management MVP

A Kanban board with an AI chat sidebar. FastAPI backend serving a static Next.js frontend, in one Docker container.

## Run

Docker must be running. Put `OPENROUTER_API_KEY` in `.env` for the AI chat.

- Start: `scripts/start.sh` (Mac, Linux) or `scripts/start.ps1` (PC), then open http://localhost:8000
- Stop: `scripts/stop.sh` or `scripts/stop.ps1`

Sign in with `user` / `password`.

## Security

Sign-in is checked only in the browser. The API is unauthenticated, so anyone who can reach port 8000 can read and change the board and use the AI. Run it locally only.

## More

Plan and design: `docs/`. Backend and frontend notes: `backend/AGENTS.md`, `frontend/AGENTS.md`.
