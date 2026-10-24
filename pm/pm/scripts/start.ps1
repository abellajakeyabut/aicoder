Set-Location (Join-Path $PSScriptRoot "..")
docker build -t pm-app .
if ($LASTEXITCODE -ne 0) { exit 1 }
docker rm -f pm-app *> $null
$envFile = @()
if (Test-Path .env) { $envFile = @("--env-file", ".env") }
docker run -d --name pm-app -p 8000:8000 @envFile -v pm-data:/data pm-app
Write-Host "Running at http://localhost:8000"
