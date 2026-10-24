# Scripts

Start and stop the app's Docker container. Run them from any directory.

- `start.sh` / `start.ps1` (Mac and Linux / PC): build the `pm-app` image from the project root, replace any existing `pm-app` container, and run it on port 8000 with volume `pm-data:/data`. Passes `--env-file .env` when `.env` exists.
- `stop.sh` / `stop.ps1`: remove the `pm-app` container. The `pm-data` volume is kept.
