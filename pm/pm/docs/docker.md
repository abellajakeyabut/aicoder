# Docker Tutorial

This tutorial walks through how the app is packaged and run with Docker: the `Dockerfile`, the files around it, and the `scripts/start.*` scripts that use it.

## The big picture

The whole app runs in one container on port 8000:

- FastAPI serves the API under `/api`.
- FastAPI also serves the frontend, a static Next.js site, at `/`.
- SQLite stores the board in `/data/app.db`, on a Docker volume so it survives restarts.

The image is built in two stages:

1. A Node stage builds the frontend into plain HTML, JS and CSS.
2. A Python stage installs the backend and copies in the built frontend.

Only the second stage becomes the final image. The first exists just to produce the static site, so the final image contains no Node, no `node_modules` and no frontend source.

## How the Dockerfile is found

`scripts/start.ps1` (and `start.sh`) first moves to the project root:

```powershell
Set-Location (Join-Path $PSScriptRoot "..")
```

`$PSScriptRoot` is the `scripts/` folder, so `..` is the project root. Then it builds:

```powershell
docker build -t pm-app .
```

- `.` is the **build context**: the folder whose files Docker can see during the build.
- Docker uses a file named `Dockerfile` at the root of the build context unless you pass `-f path/to/OtherFile`. So it picks up the `Dockerfile` in the project root.
- Every left-hand path in a `COPY` line (such as `frontend/` or `backend/app`) is relative to the build context. That is why the script must run from the project root.
- `-t pm-app` names (tags) the image `pm-app`.

### .dockerignore

Before building, Docker sends the build context to the Docker engine, skipping anything listed in `.dockerignore`:

```
.git
.env
**/node_modules
**/.next
**/out
**/.venv
**/__pycache__
**/.pytest_cache
**/test-results
**/playwright-report
```

This keeps builds fast and prevents two problems:

- Secrets: `.env` holds the OpenRouter key and must never be baked into an image.
- Wrong binaries: `node_modules` and `.venv` from your machine may contain platform-specific files (Windows builds) that would break inside a Linux container.

## The Dockerfile, line by line

```dockerfile
FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.9.30 /uv /uvx /bin/

WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app ./app
COPY --from=frontend /frontend/out ./static

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Stage 1: build the frontend

```dockerfile
FROM node:24-slim AS frontend
```

Starts a stage from the official Node 24 image. `slim` is a cut-down Debian base, which is smaller and faster to download. `AS frontend` names the stage so the second stage can copy files out of it.

```dockerfile
WORKDIR /frontend
```

Sets the working directory inside the container, creating it if needed. Every later relative path and `RUN` command in this stage happens in `/frontend`.

```dockerfile
COPY frontend/package.json frontend/package-lock.json ./
```

Copies only the two dependency files into `/frontend`. This is deliberate, for **layer caching**:

- Docker saves the result of each instruction as a layer.
- On the next build it reuses a layer if that instruction and its input files are unchanged.
- Once one layer changes, every layer after it is rebuilt.

By copying the dependency files on their own first, editing a component does not invalidate the install step below, so the slow `npm ci` is skipped on most rebuilds.

```dockerfile
RUN npm ci
```

Installs exactly the versions in `package-lock.json`. Unlike `npm install`, it never changes the lock file, and it fails if the lock file and `package.json` disagree. Dev dependencies are installed too, because the build needs Next.js, TypeScript and Tailwind.

```dockerfile
COPY frontend/ ./
```

Copies the rest of the frontend source. Because `.dockerignore` excludes `node_modules`, `.next` and `out`, this does not overwrite the freshly installed Linux `node_modules` with the ones from your machine.

```dockerfile
RUN npm run build
```

Runs `next build`. `frontend/next.config.ts` sets `output: "export"` for builds, so this produces a static site in `/frontend/out`. That folder is all the second stage needs.

### Stage 2: the runtime image

```dockerfile
FROM python:3.14-slim
```

Starts a fresh stage from the Python 3.14 slim image. Nothing from stage 1 carries over unless it is copied explicitly.

```dockerfile
COPY --from=ghcr.io/astral-sh/uv:0.9.30 /uv /uvx /bin/
```

`--from` can name an image, not just a stage. This copies the `uv` and `uvx` binaries out of the official uv image into `/bin`. It is the recommended way to get uv into an image: no `pip install` and no install script. The version is pinned so every build uses the same uv.

```dockerfile
WORKDIR /app
```

All the backend files go in `/app`.

```dockerfile
COPY backend/pyproject.toml backend/uv.lock ./
```

The same caching trick as stage 1: copy the dependency files first, so editing Python code does not trigger a reinstall.

```dockerfile
RUN uv sync --frozen --no-dev
```

Creates a virtual environment at `/app/.venv` and installs the dependencies (FastAPI, uvicorn, openai).

- `--frozen` installs exactly what `uv.lock` lists, without re-resolving or updating it. Builds are reproducible.
- `--no-dev` skips the `dev` dependency group (pytest and the test HTTP client), keeping test tools out of the image.

```dockerfile
COPY backend/app ./app
```

Copies the backend code to `/app/app`. Only the `app` package goes in; tests stay out.

```dockerfile
COPY --from=frontend /frontend/out ./static
```

Copies the built site from stage 1 to `/app/static`. In `backend/app/main.py`, `STATIC_DIR` defaults to a `static` folder next to the `app` package, which is exactly `/app/static`. FastAPI mounts it at `/`, after the API routes, so `/api/...` requests still reach the API.

```dockerfile
ENV PATH="/app/.venv/bin:$PATH"
```

Puts the virtual environment's `bin` folder first on `PATH`. A plain `uvicorn` command then runs the venv's uvicorn and Python, with no need to activate the venv or use `uv run`.

```dockerfile
EXPOSE 8000
```

Documents that the app listens on port 8000. It does not publish the port; `-p 8000:8000` in the start script does that.

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The command the container runs on start:

- `app.main:app` means the `app` object in the `app/main.py` module. It resolves because the working directory is `/app`.
- `--host 0.0.0.0` listens on all network interfaces. The default, `127.0.0.1`, would only accept connections from inside the container, so your browser could not reach it.
- The JSON array form (exec form) runs uvicorn directly rather than through a shell. Uvicorn then receives stop signals from `docker stop` and shuts down cleanly.

## Running the container

After the build, `start.ps1` replaces any old container and starts a new one:

```powershell
docker rm -f pm-app *> $null
$envFile = @()
if (Test-Path .env) { $envFile = @("--env-file", ".env") }
docker run -d --name pm-app -p 8000:8000 @envFile -v pm-data:/data pm-app
```

- `docker rm -f pm-app` removes the existing container with that name, running or not. `*> $null` hides the error when there is none.
- `--env-file .env` is added only when `.env` exists. It sets `OPENROUTER_API_KEY` as an environment variable at start-up. The key is never stored in the image. Without it, the app runs but the AI chat fails.
- `-d` runs the container in the background.
- `--name pm-app` names the container, so `stop.ps1` and the next start can find it.
- `-p 8000:8000` maps port 8000 on your machine to port 8000 in the container.
- `-v pm-data:/data` mounts a named volume at `/data`. The backend's `DB_PATH` defaults to `/data/app.db`, so the database lives in the volume, not the container.
- The final `pm-app` is the image to run.

`stop.ps1` runs `docker rm -f pm-app`. It removes the container but not the `pm-data` volume, so the board is still there on the next start.

## Where things live

| What | Where | Survives a rebuild? |
|------|-------|---------------------|
| Backend code | `/app/app` in the image | Replaced by each build |
| Frontend site | `/app/static` in the image | Replaced by each build |
| Python packages | `/app/.venv` in the image | Replaced by each build |
| API key | Environment variable from `.env` | Read again on each start |
| Database | `/data/app.db` on the `pm-data` volume | Yes |

## Useful commands

| Task | Command |
|------|---------|
| Build and start | `scripts/start.ps1` (PC) or `scripts/start.sh` (Mac, Linux) |
| Stop | `scripts/stop.ps1` or `scripts/stop.sh` |
| View logs | `docker logs -f pm-app` |
| Open a shell in the container | `docker exec -it pm-app sh` |
| List images | `docker images pm-app` |
| Delete the stored board (start fresh) | stop, then `docker volume rm pm-data` |
| Build without cache | `docker build --no-cache -t pm-app .` from the project root |

## Things to try

1. Edit a frontend component and run the start script. The `npm ci` step is reused from cache (it prints `CACHED`) and only the steps after the source `COPY` rerun.
2. Edit `frontend/package.json` and rebuild. Now `npm ci` runs again, because its input changed.
3. Run `docker exec pm-app ls /app` and notice there is no `frontend` folder and no `node_modules`: stage 1 left nothing behind except `static`.
4. Run `docker exec pm-app env` and find `OPENROUTER_API_KEY`. Then run `docker history pm-app` and confirm the key appears in no image layer.
