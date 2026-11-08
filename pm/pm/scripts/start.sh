#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
docker build -t pm-app .
docker rm -f pm-app >/dev/null 2>&1 || true
env_file=()
[ -f .env ] && env_file=(--env-file .env)
docker run -d --name pm-app -p 8000:8000 "${env_file[@]}" -v pm-data:/data pm-app
echo "Running at http://localhost:8000"
