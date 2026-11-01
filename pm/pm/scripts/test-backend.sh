#!/usr/bin/env sh
# Run the backend tests in a Python 3.14 container (no local Python or uv needed)
cd "$(dirname "$0")/../backend" || exit 1
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W 2>/dev/null || pwd):/src" -v pm-uv-venv:/venv \
  -e UV_PROJECT_ENVIRONMENT=/venv -e UV_LINK_MODE=copy -w /src \
  ghcr.io/astral-sh/uv:python3.14-bookworm-slim uv run pytest "$@"
