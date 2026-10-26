# ===============================================================
#  arrancar.ps1 - Castillo Country Club MCP Server v0.1.0
#  Inicia el servidor FastAPI + MCP usando uv en puerto 8001
# ===============================================================

Set-Location $PSScriptRoot
$env:PYTHONPATH = "$PSScriptRoot\backend\src"

# -- Verificar que uv esté instalado --
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERROR: uv no encontrado." -ForegroundColor Red
    Write-Host "  Instalalo con:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy ByPass -c 'irm https://astral.sh/uv/install.ps1 | iex'" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# -- Verificar que estamos en la carpeta correcta --
if (-not (Test-Path "$PSScriptRoot\backend\pyproject.toml")) {
    Write-Host ""
    Write-Host "  ERROR: No estas en la raiz del proyecto." -ForegroundColor Red
    Write-Host "  Ejecuta este script desde:" -ForegroundColor Yellow
    Write-Host "  club-platform-castillo_country_club\" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# -- Sincronizar dependencias si falta el entorno --
if (-not (Test-Path "$PSScriptRoot\.venv")) {
    Write-Host ""
    Write-Host "  Entorno no encontrado - instalando dependencias..." -ForegroundColor Cyan
    uv venv --python $env:PYTHON_HOME\python.exe 2>$null
    if ($LASTEXITCODE -ne 0) { uv venv }
    
    Write-Host "  Instalando dependencias del backend..." -ForegroundColor Cyan
    Push-Location backend
    uv pip install -e ".[dev]"
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Instalacion de dependencias fallo." -ForegroundColor Red
        exit 1
    }
}

# -- Crear directorios necesarios si no existen --
$dirs = @(
    "backend\data",
    "backend\logs",
    "seeds",
    "docs"
)
foreach ($dir in $dirs) {
    $fullPath = Join-Path $PSScriptRoot $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Creado: $dir" -ForegroundColor DarkGray
    }
}

# -- Banner --
Write-Host ""
Write-Host "  Castillo Country Club MCP Server v0.1.0" -ForegroundColor Magenta
Write-Host "  -----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Servidor  ->  http://localhost:8001"      -ForegroundColor Green
Write-Host "  Swagger   ->  http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "  MCP WS    ->  ws://localhost:8001/mcp"    -ForegroundColor Yellow
Write-Host "  DB        ->  PostgreSQL (puerto 5432)"   -ForegroundColor DarkGray
Write-Host "  Redis     ->  localhost:6379"             -ForegroundColor DarkGray
Write-Host "  Ollama    ->  http://localhost:11434"     -ForegroundColor DarkGray
Write-Host "  Modo      ->  desarrollo (--reload)"      -ForegroundColor DarkGray
Write-Host ""

# -- Verificar servicios Docker (solo si docker existe) --
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        $running = docker ps --format '{{.Names}}' 2>$null
        if ($running -notmatch 'postgres|redis|ollama') {
            Write-Host "  Advertencia: Algunos servicios Docker no estan corriendo." -ForegroundColor Yellow
            Write-Host "     Ejecuta: docker compose up -d" -ForegroundColor DarkGray
        }
    }
    catch {
        # Silenciar errores de docker si no está disponible
    }
}

# -- Arrancar servidor en puerto 8001 --
Write-Host "  Iniciando servidor en puerto 8001..." -ForegroundColor Green
Write-Host ""

# Entry point: backend/src/club_mcp/api/app.py -> app
uv run uvicorn club_mcp.api.app:app --reload --host 0.0.0.0 --port 8001