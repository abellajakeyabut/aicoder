# Deploying to a Raspberry Pi 3

This puts the app on a Raspberry Pi 3 on your home network. You build the image on your Windows PC and copy it to the Pi. A Pi 3 runs the app easily, but its 1 GB of RAM is too little to build the frontend.

Commands marked **PC** run in PowerShell in the project root (`pm/pm`). Commands marked **Pi** run on the Pi over SSH.

## 1. What you need

- Raspberry Pi 3 (Model B or B+), power supply, and a microSD card of 16 GB or more
- The PC with Docker Desktop running (the same setup used for `scripts/start.ps1`)
- Both on the same network (Ethernet or Wi-Fi)

## 2. Flash the SD card

1. Install Raspberry Pi Imager from https://www.raspberrypi.com/software/ and open it.
2. Device: **Raspberry Pi 3**. OS: **Raspberry Pi OS (other) > Raspberry Pi OS Lite (64-bit)**.
   It must be the 64-bit version. The image is built for 64-bit ARM and will not run on the 32-bit OS.
3. Storage: your SD card. Click Next, then **Edit settings**:
   - Hostname: `raspberrypi`
   - Username and password: for example `pi` and a password of your choice
   - Wi-Fi: your network name and password (skip this if you use Ethernet)
   - Services tab: **Enable SSH**, using password authentication
4. Save, write the card, put it in the Pi and power it on. The first boot takes a couple of minutes.

## 3. Connect to the Pi

**PC:**

```
ssh pi@raspberrypi.local
```

Answer `yes` to the fingerprint question and enter your password. If `raspberrypi.local` is not found, look up the Pi's IP address in your router's device list and use `ssh pi@<ip-address>` instead (and in every later step).

**Pi:** check that the OS is 64-bit and update it:

```
uname -m
sudo apt update && sudo apt full-upgrade -y
```

`uname -m` must print `aarch64`. If it prints `armv7l`, you flashed the 32-bit OS: go back to step 2.

## 4. Install Docker on the Pi

**Pi:**

```
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit
```

Connect again (`ssh pi@raspberrypi.local`) so the group change applies, then check:

```
docker run --rm hello-world
```

You should see "Hello from Docker!".

## 5. Build the image for the Pi

**PC:**

```
docker buildx build --platform linux/arm64 -t pm-app:arm64 --load .
docker save -o pm-app-arm64.tar pm-app:arm64
```

The build runs under emulation, so it is slower than a normal build (about 5 minutes on this PC, mostly `npm ci` and `next build`). The second command writes the image to `pm-app-arm64.tar` (roughly 80 MB).

Use `docker save -o` with a file, not `docker save | ssh ...`. Windows PowerShell 5.1 re-encodes binary data sent through a pipe, which corrupts the image.

## 6. Copy the image and settings to the Pi

**PC:**

```
scp pm-app-arm64.tar pi@raspberrypi.local:~/
scp .env pi@raspberrypi.local:~/pm.env
```

`.env` holds your `OPENROUTER_API_KEY`. Without it the board works, but the AI chat returns an error.

## 7. Start the app

**Pi:**

```
docker load -i ~/pm-app-arm64.tar
docker run -d --name pm-app --restart unless-stopped -p 8000:8000 --env-file ~/pm.env -v pm-data:/data pm-app:arm64
rm ~/pm-app-arm64.tar
```

`--restart unless-stopped` starts the app again after the Pi reboots. The board is stored in the `pm-data` volume, so it is kept across restarts and updates.

## 8. Check it works

**Pi:**

```
docker ps
curl http://localhost:8000/api/health
```

`docker ps` should list `pm-app` as `Up`, and the health check should print `{"status":"ok"}`.

From any device on your network, open http://raspberrypi.local:8000 (or `http://<ip-address>:8000`) and sign in with `user` / `password`. The Pi starts with the default sample board. Your board on the PC is not copied.

## 9. Update to a new version

Repeat steps 5 and 6 (only the `.tar` copy is needed unless `.env` changed), then on the **Pi**:

```
docker load -i ~/pm-app-arm64.tar
docker rm -f pm-app
docker run -d --name pm-app --restart unless-stopped -p 8000:8000 --env-file ~/pm.env -v pm-data:/data pm-app:arm64
rm ~/pm-app-arm64.tar
docker image prune -f
```

The board data is kept, because it lives in the volume, not the container.

## 10. Everyday commands

**Pi:**

| Task | Command |
| --- | --- |
| Stop the app | `docker stop pm-app` |
| Start it again | `docker start pm-app` |
| View logs | `docker logs --tail 50 pm-app` |
| Back up the board | `docker cp pm-app:/data/app.db ~/app-backup.db` |
| Copy a backup to the PC (run on the **PC**) | `scp pi@raspberrypi.local:~/app-backup.db .` |
| Remove the app and its data | `docker rm -f pm-app` then `docker volume rm pm-data` |

## 11. Troubleshooting

| Problem | Cause and fix |
| --- | --- |
| `exec format error` in `docker logs pm-app` | The image doesn't match the Pi's chip. Check that `uname -m` prints `aarch64`, and that you built with `--platform linux/arm64` and ran `pm-app:arm64` |
| `docker load` fails with an unexpected EOF or invalid tar header | The `.tar` was corrupted or only partly copied. Make it again with `docker save -o` (not a pipe) and copy it again |
| `raspberrypi.local` not found | Use the Pi's IP address (shown by `hostname -I` on the Pi, or in your router's device list). A DHCP reservation in your router keeps the address fixed |
| Page doesn't load from another device | Run `curl http://localhost:8000/api/health` on the Pi. If that works, the device is on another network, or a VPN or guest Wi-Fi is isolating it |
| `port is already allocated` | Something else uses port 8000. Use `-p 8080:8000` and open port 8080 instead |
| AI chat says something went wrong | Check `~/pm.env` contains `OPENROUTER_API_KEY=...`, then run `docker logs pm-app` |

## 12. Security

- The API does not check sign-in (see `docs/PLAN.md`). Anyone who can reach port 8000 can read or replace the board, and their chat messages use your OpenRouter credits. Keep it on your home network and do not forward port 8000 on your router.
- `~/pm.env` on the Pi holds your API key. Restrict it with `chmod 600 ~/pm.env`.
- Change the Pi's password if you used a simple one, and keep the Pi updated with `sudo apt update && sudo apt full-upgrade -y`.
