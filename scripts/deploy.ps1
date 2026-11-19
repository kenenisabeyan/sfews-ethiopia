# ========================================================
# SFEWS Production Automated Deployment Script (Windows)
# Zero-Downtime Multi-Container Build & Health Validation
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   ~~~ SFEWS Autonomous Command Center Deployment ~~~   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check Docker
Write-Host "`n[1/5] Checking System Prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker engine is not installed or not in PATH." -ForegroundColor Red
    exit 1
}
Write-Host "Docker engine verified." -ForegroundColor Green

# 2. Check Environment
Write-Host "`n[2/5] Validating Environment Configurations..." -ForegroundColor Yellow
$envFile = ".env.production"
if (-not (Test-Path ".env.production")) {
    if (Test-Path ".env") {
        $envFile = ".env"
    } else {
        Copy-Item ".env.production.example" ".env.production"
    }
}
Write-Host "Using environment file: $envFile" -ForegroundColor Green

# 3. Build Images
Write-Host "`n[3/5] Building Production Images..." -ForegroundColor Yellow
docker compose --env-file $envFile build

# 4. Deploy Containers
Write-Host "`n[4/5] Launching Production Service Stack..." -ForegroundColor Yellow
docker compose --env-file $envFile up -d --remove-orphans

# 5. Health Check
Write-Host "`n[5/5] Awaiting Container Health & Liveness Verification..." -ForegroundColor Yellow
$maxRetries = 20
$count = 0
$healthy = $false

while ($count -lt $maxRetries) {
    $backendStatus = docker inspect --format='{{json .State.Health.Status}}' sfews-backend 2>$null
    $frontendStatus = docker inspect --format='{{json .State.Health.Status}}' sfews-frontend 2>$null

    if ($backendStatus -eq '"healthy"' -and $frontendStatus -eq '"healthy"') {
        $healthy = $true
        break
    }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 3
    $count++
}

Write-Host ""
if ($healthy) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "SFEWS PRODUCTION STACK SUCCESSFULLY DEPLOYED! 🚀" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Frontend Console : http://localhost"
    Write-Host "Backend API Docs : http://localhost:8000/docs"
    Write-Host "Health Diagnostic: http://localhost:8000/api/v1/system/diagnostics"
    Write-Host "WebSocket Tunnel : ws://localhost:8000/api/v1/ws/dashboard"
    Write-Host "========================================================"
} else {
    Write-Host "Warning: Containers still initializing. Check logs with: docker compose logs" -ForegroundColor Yellow
}
