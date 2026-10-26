#!/usr/bin/env python3
"""Generador completo de Club Platform MCP Server (11 agentes, HITL, Ollama, React)"""
import sys
import json
import textwrap
import argparse
from pathlib import Path
from dataclasses import dataclass

# Forzar salida inmediata en Windows/PowerShell
sys.stdout.reconfigure(line_buffering=True)

@dataclass
class ClubConfig:
    name: str
    display_name: str
    club_type: str
    country: str
    primary_color: str
    secondary_color: str
    accent_color: str
    age_group_activities: dict[str, list[str]]

CLUBS = {
    "castillo": ClubConfig(
        name="castillo_country_club",
        display_name="Castillo Country Club",
        club_type="country",
        country="CR",
        primary_color="#8B7355",
        secondary_color="#D4AF37",
        accent_color="#2C5F2D",
        age_group_activities={
            "toddler": ["sensory_play", "music_time", "story_corner"],
            "kids": ["soccer_school", "art_workshop", "swimming"],
            "teens": ["esports_lounge", "volleyball", "leadership"],
            "young": ["networking", "fitness", "wine_tasting"],
            "adult": ["golf", "spa", "business_lunch"],
            "senior": ["bridge", "yoga_gentle", "cultural_tours"],
            "family": ["bbq_sundays", "movie_night", "holidays"],
        },
    )
}

def t(s: str) -> str:
    return textwrap.dedent(s).strip()

def get_structure(club: ClubConfig) -> dict[str, str | None]:
    n = club.name
    d = club.display_name
    return {
        # RAÍZ
        "README.md": t(f"""# {d}
AI Multi-Agent MCP Server for Private Club Management.

```bash
cd club-platform-{n}
python -m venv .venv
.venv\\Scripts\\activate.bat
cd backend && pip install -e ".[dev]"
cd ..\\frontend && npm install
cd ..
docker compose up -d
make dev
```"""),
        ".gitignore": t("""__pycache__/
*.pyc
.env
node_modules/
.venv/
dist/
build/
*.egg-info/
.DS_Store"""),
        ".env.example": t(f"""CLUB_NAME={n}
CLUB_ENV=development
DATABASE_URL=postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db
REDIS_URL=redis://localhost:6379/0
OLLAMA_HOST=http://localhost:11434
OLLAMA_FAST_MODEL=qwen2.5:7b
OLLAMA_SMART_MODEL=qwen2.5:32b
JWT_SECRET_KEY=dev-secret-change-me
"""),
        "docker-compose.yml": t("""version: "3.9"
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: club_db
      POSTGRES_USER: club_user
      POSTGRES_PASSWORD: club_pass
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama_data:/root/.ollama"]
volumes:
  pgdata:
  ollama_data:"""),
        "Makefile": t(""".PHONY: dev install test

dev:
\tdocker compose up -d
\t@echo "Backend: http://localhost:8000"
\t@echo "Frontend: http://localhost:5173"

install:
\tcd backend && pip install -e ".[dev]"
\tcd frontend && npm install

test:
\tcd backend && pytest -v
\tcd frontend && npm test"""),

        # BACKEND
        "backend/pyproject.toml": t(f"""[project]
name = "club-mcp-server"
version = "0.1.0"
description = "MCP Server for {d}"
requires-python = ">=3.12"
dependencies = [
  "fastmcp>=0.1.0", "fastapi>=0.115.0", "uvicorn[standard]>=0.34.0",
  "sqlalchemy[asyncio]>=2.0.36", "asyncpg>=0.30.0", "alembic>=1.14.0",
  "pydantic>=2.10.0", "pydantic-settings>=2.7.0", "redis>=5.2.0",
  "ollama>=0.4.0", "httpx>=0.28.0", "pgvector>=0.3.0", "structlog>=24.4.0"
]
[project.optional-dependencies]
dev = ["pytest>=8.3", "pytest-asyncio>=0.24", "ruff>=0.8", "mypy>=1.13"]
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
[tool.ruff]
target-version = "py312"
line-length = 100"""),
        "backend/src/club_mcp/__init__.py": "",
        "backend/src/club_mcp/server.py": t(f'''"""MCP Server Entry Point"""
from fastmcp import FastMCP
from club_mcp.config.settings import get_settings

def create_mcp_server() -> FastMCP:
    settings = get_settings()
    mcp = FastMCP(name="{d} MCP", version="0.1.0")
    
    @mcp.tool()
    def ping() -> str:
        return f"Alive | Club: {{settings.club_name}}"
    
    # TODO: Register 11 agents here
    return mcp

if __name__ == "__main__":
    create_mcp_server().run()'''),
        "backend/src/club_mcp/config/__init__.py": "",
        "backend/src/club_mcp/config/settings.py": t("""from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    club_name: str = "castillo_country_club"
    club_env: str = "development"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/club_db"
    redis_url: str = "redis://localhost:6379/0"
    ollama_host: str = "http://localhost:11434"
    ollama_fast_model: str = "qwen2.5:7b"
    ollama_smart_model: str = "qwen2.5:32b"
    jwt_secret_key: str = "change-me"

@lru_cache
def get_settings() -> Settings:
    return Settings()"""),
        "backend/src/club_mcp/agents/__init__.py": "",
        "backend/src/club_mcp/agents/base.py": t('''"""Base Agent Class with HITL support"""
from abc import ABC, abstractmethod
from pydantic import BaseModel
from enum import Enum

class ApprovalLevel(str, Enum):
    AUTO = "auto"
    HITL = "hitl"
    ALWAYS_HUMAN = "always_human"

class ToolDef(BaseModel):
    name: str
    description: str
    approval: ApprovalLevel = ApprovalLevel.AUTO

class BaseAgent(ABC):
    agent_name: str = "base"
    description: str = ""
    tools: list[ToolDef] = []

    @abstractmethod
    def register_tools(self, mcp) -> None: ...
'''),
        "backend/src/club_mcp/api/__init__.py": "",
        "backend/src/club_mcp/api/app.py": t("""from fastapi import FastAPI
from club_mcp.config.settings import get_settings

app = FastAPI(title="Club Platform API", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "club": get_settings().club_name}
"""),

        # FRONTEND
        "frontend/package.json": json.dumps({
            "name": "club-frontend", "private": True, "version": "0.1.0", "type": "module",
            "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
            "dependencies": {"react": "^19.0.0", "react-dom": "^19.0.0", "react-router-dom": "^7.0.0", "@tanstack/react-query": "^5.60.0", "lucide-react": "^0.460.0", "clsx": "^2.1.0"},
            "devDependencies": {"@vitejs/plugin-react": "^4.3.0", "typescript": "~5.7.0", "vite": "^6.0.0", "tailwindcss": "^4.0.0", "@tailwindcss/vite": "^4.0.0"}
        }, indent=2),
        "frontend/vite.config.ts": t('''import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({ plugins: [react(), tailwindcss()], server: { proxy: { "/api": { target: "http://localhost:8000" } } } })'''),
        "frontend/index.html": t(f'''<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{d}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>'''),
        "frontend/src/main.tsx": f'import {{ createRoot }} from "react-dom/client"\ncreateRoot(document.getElementById("root")!).render(<h1>🏡 {d} Platform</h1>)',
        "frontend/src/styles/globals.css": "@import 'tailwindcss';\n\nbody { background: #0d0d0d; color: #f0ece4; font-family: system-ui; }",
        
        # SCRIPTS & DOCS
        "scripts/setup.sh": t("""#!/bin/bash
set -e
echo "🏡 Setup iniciado"
command -v uv >/dev/null || { echo "Instala uv: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
docker compose up -d
echo "✅ Listo: http://localhost:5173"""),
        "docs/ARCHITECTURE.md": t(f"""# {d} Architecture
- Frontend (React) -> FastAPI -> MCP Server -> 11 Agents -> DB
- Local AI: Ollama (Qwen 2.5 7B/32B)
- HITL: 4 niveles de aprobación humana
- Multi-tenant: config/clubs/{n}.json"""),

        # DIRS
        "backend": None, "backend/src": None, "backend/src/club_mcp": None,
        "backend/src/club_mcp/config": None, "backend/src/club_mcp/agents": None,
        "backend/src/club_mcp/api": None, "frontend": None, "frontend/src": None,
        "frontend/src/styles": None, "scripts": None, "docs": None,
    }

def build(club_name: str, output_dir: str) -> None:
    club = CLUBS.get(club_name)
    if not club:
        print(f"❌ Club no encontrado: {club_name}")
        return
        
    root = Path(output_dir) / f"club-platform-{club.name}"
    print(f"🚀 Generando {club.display_name}...\n", flush=True)
    
    files = dirs = 0
    for path, content in get_structure(club).items():
        full = root / path
        if content is None:
            full.mkdir(parents=True, exist_ok=True)
            dirs += 1
            print(f"  📂 {path}/", flush=True)
        else:
            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_text(content, encoding="utf-8", newline="\n")
            files += 1
            print(f"  📄 {path}", flush=True)
            
    print(f"\n✅ COMPLETO: {files} archivos, {dirs} carpetas")
    print(f"📍 {root.absolute()}\n")
    print("🔜 Siguientes pasos:\n   cd backend && pip install -e .[dev]\n   cd ..\\frontend && npm install\n   cd .. && docker compose up -d")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--club", choices=CLUBS.keys(), default="castillo")
    p.add_argument("--output", default=".")
    args = p.parse_args()
    build(args.club, args.output)