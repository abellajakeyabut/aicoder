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
