# Scripts

Start and stop the app's Docker container. Run them from any directory.

- `start.sh` / `start.ps1` (Mac and Linux / PC): build the `pm-app` image from the project root, replace any existing `pm-app` container, and run it on port 8000 with volume `pm-data:/data`. Passes `--env-file .env` when `.env` exists.
- `stop.sh` / `stop.ps1`: remove the `pm-app` container. The `pm-data` volume is kept.
- `buildpi.ps1`: build the `pm-app:arm64` image, save it to `pm-app-arm64.tar`, and scp the tar and `.env` (as `pm.env`) to `root@192.168.0.4:~/`. On first run it installs an SSH key on the Pi (one password prompt); later runs need no password.
- `test-backend.sh`: run the backend pytest suite in a `ghcr.io/astral-sh/uv` Python 3.14 container (no local Python or uv needed). The virtualenv is cached in the `pm-uv-venv` volume. Extra arguments go to pytest.
