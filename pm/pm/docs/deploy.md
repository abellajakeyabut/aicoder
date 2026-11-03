# Deploy to Raspberry Pi (192.168.0.4)

## Prerequisites

- Docker Desktop with buildx on the PC.
- Docker on the Pi: `curl -fsSL https://get.docker.com | sh`
- 64-bit Pi OS: `uname -m` must print `aarch64`.
- `OPENROUTER_API_KEY` in `.env` in the project root.

## 1. Build and copy (PC)

```powershell
.\scripts\buildpi.ps1
```

Builds the `pm-app:arm64` image, saves it to `pm-app-arm64.tar`, and copies the tar and `.env` (as `pm.env`) to `root@192.168.0.4:~/`. The first run installs an SSH key on the Pi and asks for the root password once.

## 2. Load and run (Pi)

```bash
ssh root@192.168.0.4
docker load -i ~/pm-app-arm64.tar
docker rm -f pm-app 2>/dev/null
docker run -d --name pm-app --restart unless-stopped \
  -p 8000:8000 --env-file ~/pm.env -v pm-data:/data pm-app:arm64
```

Open http://192.168.0.4:8000 and sign in with `user` / `password`.

The container restarts after a reboot. Data is kept in the `pm-data` volume across redeploys.

## Redeploy

From the PC, in one step:

```powershell
.\scripts\buildpi.ps1; if ($?) { ssh root@192.168.0.4 "docker load -i ~/pm-app-arm64.tar && docker rm -f pm-app; docker run -d --name pm-app --restart unless-stopped -p 8000:8000 --env-file ~/pm.env -v pm-data:/data pm-app:arm64" }
```

## Operate (Pi)

- Logs: `docker logs -f pm-app`
- Stop: `docker rm -f pm-app` (data volume is kept)

## Security

No HTTPS, rate limiting or CSRF protection, and the demo account is always present. Keep port 8000 on the local network only. Do not forward it to the internet.
