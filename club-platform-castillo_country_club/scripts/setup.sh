#!/bin/bash
set -e
echo "🏡 Setup iniciado"
command -v uv >/dev/null || { echo "Instala uv: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
docker compose up -d
echo "✅ Listo: http://localhost:5173