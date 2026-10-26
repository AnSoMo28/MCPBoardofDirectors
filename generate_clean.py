# generate_clean.py
import sys
sys.stdout.reconfigure(line_buffering=True)

from pathlib import Path
import json

CLUB = {
    "name": "castillo_country_club",
    "display_name": "Castillo Country Club",
    "activities": {
        "toddler": ["sensory_play", "music_time"],
        "kids": ["soccer_school", "art_workshop"],
        "adult": ["golf_tournament", "spa_day"]
    }
}

print("🚀 Generando estructura del proyecto...", flush=True)

root = Path(".") / f"club-platform-{CLUB['name']}"

# Archivos y carpetas esenciales
structure = {
    "README.md": f"# {CLUB['display_name']}\n\nAI Multi-Agent MCP Server\n",
    ".env.example": f"""CLUB_NAME={CLUB['name']}
CLUB_ENV=development
DATABASE_URL=postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db
REDIS_URL=redis://localhost:6379/0
OLLAMA_HOST=http://localhost:11434
JWT_SECRET_KEY=dev-secret-change-me
""",
    "docker-compose.yml": """version: "3.9"
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: club_db
      POSTGRES_USER: club_user
      POSTGRES_PASSWORD: club_pass
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
""",
    "Makefile": ".PHONY: dev\n\ndev:\n\tdocker compose up -d\n\t@echo '✅ Servicios listos'\n",
    "backend/pyproject.toml": f"""[project]
name = "club-mcp-server"
version = "0.1.0"
description = "{CLUB['display_name']} MCP"
requires-python = ">=3.12"
dependencies = ["fastmcp", "fastapi", "uvicorn[standard]", "pydantic-settings"]
""",
    "backend/src/club_mcp/__init__.py": "",
    "backend/src/club_mcp/config/__init__.py": "",
    "backend/src/club_mcp/config/settings.py": """from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    club_name: str = "castillo_country_club"
    club_env: str = "development"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/club_db"
    redis_url: str = "redis://localhost:6379/0"
    ollama_host: str = "http://localhost:11434"
    jwt_secret_key: str = "change-me"
""",
    "frontend/package.json": '{"name":"club-frontend","version":"0.1.0","type":"module","scripts":{"dev":"vite"},"dependencies":{"react":"^19.0.0","react-dom":"^19.0.0"}}',
    "frontend/vite.config.ts": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });',
    "frontend/index.html": '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Club</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    "frontend/src/main.tsx": 'import { createRoot } from "react-dom/client";\ncreateRoot(document.getElementById("root")!).render(<h1>🏡 Club Platform</h1>);',
    "scripts/setup.sh": "#!/bin/bash\necho '🏡 Setup iniciado'\n",
}

files = 0
for path, content in structure.items():
    full = root / path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(content, encoding="utf-8")
    files += 1
    print(f"  📄 {path}", flush=True)

print(f"\n✅ PROYECTO GENERADO: {files} archivos", flush=True)
print(f"📍 Ruta: {root.absolute()}", flush=True)
print("\n🚀 Siguientes pasos:", flush=True)
print(f"   cd {root.name}", flush=True)
print("   code .", flush=True)
print("   python -m venv .venv && .venv\\Scripts\\activate", flush=True)
print("   cd backend && pip install -e .", flush=True)