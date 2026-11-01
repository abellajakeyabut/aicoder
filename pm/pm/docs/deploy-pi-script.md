# Proposed script: scripts/deploypi.ps1

Builds the arm64 image, saves it to a tar, and copies the tar and `.env` to the Pi.
Uses SSH key authentication, so no password prompts.
Run from anywhere: `.\scripts\deploypi.ps1`

```powershell
Set-Location (Join-Path $PSScriptRoot "..")
$target = "root@192.168.0.4"
$key = Join-Path $env:USERPROFILE ".ssh\id_ed25519"

# One-time setup: create a key and install it on the Pi (asks for the Pi password once, ever)
ssh -o BatchMode=yes -o ConnectTimeout=5 $target exit 2> $null
if ($LASTEXITCODE -ne 0) {
    if (-not (Test-Path $key)) { ssh-keygen -t ed25519 -f $key -N '""' -q }
    $pub = (Get-Content "$key.pub").Trim()
    ssh $target "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pub' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

docker buildx build --platform linux/arm64 -t pm-app:arm64 --load .
if ($LASTEXITCODE -ne 0) { exit 1 }

docker save -o pm-app-arm64.tar pm-app:arm64
if ($LASTEXITCODE -ne 0) { exit 1 }

scp -o BatchMode=yes pm-app-arm64.tar "${target}:~/"
if ($LASTEXITCODE -ne 0) { exit 1 }

scp -o BatchMode=yes .env "${target}:~/pm.env"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Copied pm-app-arm64.tar and pm.env to ${target}:~/"
```

## Notes

- The password is not stored in the script. OpenSSH `scp` cannot take a password as an argument, and a plaintext password in a script is a security risk. A key does the same job without either problem.
- First run: if key login does not work yet, the script creates `~\.ssh\id_ed25519` (if missing) and installs it on the Pi. This asks for the Pi password once. Every run after that has no prompts.
- If you have never connected to 192.168.0.4 before, `ssh` also asks once to accept the host fingerprint (type `yes`).
- `BatchMode=yes` makes `scp` fail rather than fall back to a password prompt.
- `-N '""'` sets an empty key passphrase. This form is required for Windows PowerShell 5.1.
- Builds for `linux/arm64` (the Pi), same as `docs/DEPLOY_PI.md`.
- `docker save -o` writes to a file, not a pipe, so PowerShell 5.1 does not corrupt the binary.
- `"${target}:~/"` uses braces because `$target:` would otherwise be read as a scoped variable.
- Each step stops the script on failure, so a failed build never copies a stale tar.
- `pm-app-arm64.tar` is not in `.gitignore`. Suggest adding it.
