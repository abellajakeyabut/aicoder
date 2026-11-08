#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
target="root@192.168.0.4"
key="$HOME/.ssh/id_ed25519"

# One-time setup: create a key and install it on the Pi (asks for the Pi password once, ever)
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$target" exit 2>/dev/null; then
  [ -f "$key" ] || ssh-keygen -t ed25519 -f "$key" -N "" -q
  pub="$(cat "$key.pub")"
  ssh "$target" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pub' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
fi

docker buildx build --platform linux/arm64 -t pm-app:arm64 --load .
docker save -o pm-app-arm64.tar pm-app:arm64
scp -o BatchMode=yes pm-app-arm64.tar "$target:~/"
scp -o BatchMode=yes .env "$target:~/pm.env"

echo "Copied pm-app-arm64.tar and pm.env to $target:~/"
