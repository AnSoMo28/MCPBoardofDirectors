#!/usr/bin/env python3
"""
Club Platform MCP Server - Project Scaffold Generator
Generates a complete multi-agent MCP server for private club management.

Features:
- 11 specialized AI agents with 78 tools
- Human-in-the-Loop (HITL) approval system
- Local LLM inference via Ollama (Qwen 2.5)
- Modern Python: uv, uvicorn, pyproject.toml, FastAPI, FastMCP
- React/TypeScript frontend with Tailwind CSS
- Docker compose with PostgreSQL, Redis, Ollama
- Multi-tenant architecture

Usage:
    python scaffold.py --club castillo
    python scaffold.py --all
    python scaffold.py --club castillo --output ~/projects
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any
from dataclasses import dataclass


# ════════════════════════════════════════════════════════════════
# CLUB CONFIGURATIONS (Multi-Tenant Support)
# ════════════════════════════════════════════════════════════════

@dataclass
class ClubConfig:
    """Configuration for a private club."""
    name: str
    display_name: str
    club_type: str  # "country", "beach", "mountain", "urban"
    country: str
    primary_color: str
    secondary_color: str
    accent_color: str
    age_group_activities: dict[str, list[str]]


CLUBS: dict[str, ClubConfig] = {
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
            "kids": ["soccer_school", "art_workshop", "swimming_lessons"],
            "teens": ["esports_lounge", "volleyball", "leadership_club"],
            "young": ["networking_events", "fitness_classes", "wine_tasting"],
            "adult": ["golf_tournament", "spa_day", "business_lunch"],
            "senior": ["bridge_club", "yoga_gentle", "cultural_tours"],
            "family": ["bbq_sundays", "movie_night", "holiday_celebrations"],
        },
    ),
    # Add more clubs here as needed
}


# ════════════════════════════════════════════════════════════════
# ROOT LEVEL FILES
# ════════════════════════════════════════════════════════════════

ROOT_README = """# {club.display_name} - AI Club Platform

Multi-agent MCP server for intelligent private club management.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo>
cd club-platform-{club.name}
bash scripts/setup.sh

# Start development environment
make dev

# Access services
Frontend: http://localhost:5173
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
"""

ROOT_GITIGNORE = """# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
dist/
build/
.eggs/
*.egg
.mypy_cache/
.ruff_cache/
.pytest_cache/
htmlcov/
.coverage

# Virtual environments
.venv/
venv/
env/

# Node
node_modules/
frontend/dist/
.vite/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
*.swp
*.swo
*~
.DS_Store

# Docker
docker-compose.override.yml

# Logs
*.log
logs/

# Database
*.db
*.sqlite3

# Ollama models
models/
"""

ROOT_ENV_EXAMPLE = """# ══════════════════════════════════════════
# {club.display_name} - Environment Variables
# ══════════════════════════════════════════

# Club
CLUB_NAME={club.name}
CLUB_ENV=development

# Database
DATABASE_URL=postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_FAST_MODEL=qwen2.5:7b
OLLAMA_SMART_MODEL=qwen2.5:32b

# Auth
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Notifications (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=

# Sentry (optional)
SENTRY_DSN=

# Cloud AI fallback (optional)
CLOUD_AI_ENABLED=false
CLOUD_AI_API_KEY=
"""

ROOT_DOCKER_COMPOSE = """version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: club_db
      POSTGRES_USER: club_user
      POSTGRES_PASSWORD: club_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    ports:
      - "8000:8000"
    env_file: backend/.env
    depends_on:
      - postgres
      - redis
      - ollama
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  pgdata:
  ollama_data:
"""

ROOT_MAKEFILE = """.PHONY: dev install test lint clean seed

dev:
\tdocker compose up -d postgres redis ollama
\tcd backend && uv run uvicorn club_mcp.api.app:app --reload --port 8000 &
\tcd frontend && npm run dev

install:
\tcd backend && uv sync
\tcd frontend && npm install

test:
\tcd backend && uv run pytest -v --cov=club_mcp
\tcd frontend && npm test

lint:
\tcd backend && uv run ruff check --fix
\tcd backend && uv run mypy src/
\tcd frontend && npm run lint

clean:
\trm -rf backend/.mypy_cache backend/.pytest_cache
\trm -rf frontend/node_modules frontend/dist
\tfind . -type d -name __pycache__ -exec rm -rf {{}} +

seed:
\tcd backend && uv run python ../scripts/seed_data.py
"""


# ════════════════════════════════════════════════════════════════
# VSCODE CONFIGURATION
# ════════════════════════════════════════════════════════════════

VSCODE_SETTINGS = """{
  "python.defaultInterpreterPath": "${{workspaceFolder}}/backend/.venv/bin/python",
  "python.terminal.activateEnvironment": true,
  "[python]": {{
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {{
      "source.fixAll.ruff": "explicit",
      "source.organizeImports.ruff": "explicit"
    }}
  }},
  "[typescriptreact]": {{
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }},
  "[typescript]": {{
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }},
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\\\(([^)]*)\\\\)", "(?:\"|')([^\"']*)(?:\"|')"],
    ["cn\\\\(([^)]*)\\\\)", "(?:\"|')([^\"']*)(?:\"|')"]
  ],
  "files.associations": {{
    "*.css": "tailwindcss"
  }},
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.minimap.enabled": false,
  "editor.wordWrap": "on",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "search.exclude": {{
    "**/node_modules": true,
    "**/dist": true,
    "**/.venv": true
  }}
}}
"""

VSCODE_EXTENSIONS = """{
  "recommendations": [
    "ms-python.python",
    "charliermarsh.ruff",
    "ms-python.mypy-type-checker",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "dsznajder.es7-react-js-snippets",
    "ms-playwright.playwright",
    "humao.rest-client",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "streetsidesoftware.code-spell-checker",
    "ms-vscode.live-server"
  ]
}}
"""

VSCODE_LAUNCH = """{
  "version": "0.2.0",
  "configurations": [
    {{
      "name": "Backend: MCP Server",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "club_mcp.api.app:app",
        "--reload",
        "--port", "8000"
      ],
      "cwd": "${{workspaceFolder}}/backend",
      "env": {{
        "PYTHONPATH": "${{workspaceFolder}}/backend/src"
      }},
      "console": "integratedTerminal"
    }},
    {{
      "name": "Backend: Tests",
      "type": "debugpy",
      "request": "launch",
      "module": "pytest",
      "args": ["-v", "--tb=short"],
      "cwd": "${{workspaceFolder}}/backend",
      "env": {{
        "PYTHONPATH": "${{workspaceFolder}}/backend/src"
      }},
      "console": "integratedTerminal"
    }}
  ]
}}
"""

VSCODE_TASKS = """{
  "version": "2.0.0",
  "tasks": [
    {{
      "label": "Dev: Start All",
      "dependsOn": ["Dev: Docker Up", "Dev: Backend", "Dev: Frontend"],
      "group": "build"
    }},
    {{
      "label": "Dev: Docker Up",
      "type": "shell",
      "command": "docker compose up -d postgres redis ollama",
      "problemMatcher": []
    }},
    {{
      "label": "Dev: Backend",
      "type": "shell",
      "command": "cd backend && uv run uvicorn club_mcp.api.app:app --reload --port 8000",
      "problemMatcher": "python",
      "isBackground": true
    }},
    {{
      "label": "Dev: Frontend",
      "type": "shell",
      "command": "cd frontend && npm run dev",
      "problemMatcher": "tsc-watch",
      "isBackground": true
    }},
    {{
      "label": "Test: Backend",
      "type": "shell",
      "command": "cd backend && uv run pytest -v --cov=club_mcp",
      "problemMatcher": []
    }},
    {{
      "label": "Lint: All",
      "type": "shell",
      "command": "cd backend && uv run ruff check --fix && cd ../frontend && npm run lint",
      "problemMatcher": []
    }}
  ]
}}
"""


# ════════════════════════════════════════════════════════════════
# GITHUB CI/CD
# ════════════════════════════════════════════════════════════════

GITHUB_CI = """name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: club_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: cd backend && uv sync --frozen
      - run: cd backend && uv run ruff check src/
      - run: cd backend && uv run mypy src/
      - run: cd backend && uv run pytest -v
    env:
      DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/club_test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
"""

GITHUB_DEPLOY = """name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "TODO: Configure deployment to your infrastructure"
"""


# ════════════════════════════════════════════════════════════════
# BACKEND FILES
# ════════════════════════════════════════════════════════════════

BACKEND_PYPROJECT = """[project]
name = "club-mcp-server"
version = "0.1.0"
description = "MCP Server for {club.display_name}"
requires-python = ">=3.12"
dependencies = [
  "fastmcp>=0.1.0",
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.34.0",
  "sqlalchemy[asyncio]>=2.0.36",
  "asyncpg>=0.30.0",
  "alembic>=1.14.0",
  "pydantic>=2.10.0",
  "pydantic-settings>=2.7.0",
  "redis>=5.2.0",
  "ollama>=0.4.0",
  "httpx>=0.28.0",
  "python-jose[cryptography]>=3.3.0",
  "passlib[bcrypt]>=1.7.4",
  "python-multipart>=0.0.18",
  "pgvector>=0.3.0",
  "structlog>=24.4.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3.0",
  "pytest-asyncio>=0.24.0",
  "pytest-cov>=6.0.0",
  "ruff>=0.8.0",
  "mypy>=1.13.0",
  "factory-boy>=3.3.0",
  "faker>=33.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/club_mcp"]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.mypy]
python_version = "3.12"
strict = true
"""

BACKEND_ALEMBIC_INI = """[alembic]
script_location = alembic
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %%(levelname)-5.5s [%%(name)s] %%(message)s
datefmt = %%H:%%M:%%S
"""

BACKEND_ALEMBIC_ENV = '''"""Alembic environment configuration."""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None  # TODO: Import your Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''

BACKEND_ENV_EXAMPLE = """# Backend Environment - {club.display_name}
DATABASE_URL=postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db
REDIS_URL=redis://localhost:6379/0
OLLAMA_HOST=http://localhost:11434
OLLAMA_FAST_MODEL=qwen2.5:7b
OLLAMA_SMART_MODEL=qwen2.5:32b
JWT_SECRET_KEY=dev-secret-change-in-production
CLUB_NAME={club.name}
"""

BACKEND_SERVER = '''"""
MCP Server entry point for {club.display_name}.

This is the main MCP server that registers all agents and their tools,
manages context, and routes requests.
"""

from __future__ import annotations

import asyncio
import logging
from fastmcp import FastMCP

from club_mcp.config.settings import get_settings
from club_mcp.config.club_registry import get_club_config

from club_mcp.agents.family_profile import FamilyProfileAgent
from club_mcp.agents.event_orchestrator import EventOrchestratorAgent
from club_mcp.agents.age_group import AgeGroupAgent
from club_mcp.agents.financial import FinancialAgent
from club_mcp.agents.sports_recreation import SportsRecreationAgent
from club_mcp.agents.cultural_social import CulturalSocialAgent
from club_mcp.agents.communication import CommunicationAgent
from club_mcp.agents.facility_management import FacilityManagementAgent
from club_mcp.agents.member_engagement import MemberEngagementAgent
from club_mcp.agents.guest_management import GuestManagementAgent
from club_mcp.agents.recommender import ProactiveRecommendationAgent

logger = logging.getLogger(__name__)


def create_mcp_server() -> FastMCP:
    """Create and configure the MCP server with all agents."""
    settings = get_settings()
    club = get_club_config(settings.club_name)

    mcp = FastMCP(
        name=f"{{club.display_name}} Club MCP",
        version="0.1.0",
    )

    # ── Register all agents ──
    agents = [
        FamilyProfileAgent(),
        EventOrchestratorAgent(),
        AgeGroupAgent(),
        FinancialAgent(),
        SportsRecreationAgent(),
        CulturalSocialAgent(),
        CommunicationAgent(),
        FacilityManagementAgent(),
        MemberEngagementAgent(),
        GuestManagementAgent(),
        ProactiveRecommendationAgent(),
    ]

    for agent in agents:
        agent.register_with_mcp(mcp)
        logger.info(f"Registered agent: {{agent.agent_name}}")

    logger.info(
        f"MCP Server ready for {{club.display_name}} "
        f"with {{len(agents)}} agents"
    )
    return mcp


def main() -> None:
    """Run the MCP server."""
    mcp = create_mcp_server()
    mcp.run()


if __name__ == "__main__":
    main()
'''

BACKEND_SETTINGS = '''"""
Application settings using Pydantic Settings.
All configuration is loaded from environment variables.
"""

from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Club
    club_name: str = "castillo_country_club"
    club_env: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_fast_model: str = "qwen2.5:7b"
    ollama_smart_model: str = "qwen2.5:32b"

    # Auth
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Cloud AI (optional)
    cloud_ai_enabled: bool = False
    cloud_ai_api_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.club_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
'''

BACKEND_DEPENDENCIES = '''"""
Dependency injection container.
"""

from __future__ import annotations

from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession

from club_mcp.config.settings import get_settings, Settings
from club_mcp.db.connection import get_db_session


async def get_settings_dep() -> Settings:
    """FastAPI dependency for settings."""
    return get_settings()


async def get_db() -> AsyncSession:
    """FastAPI dependency for database session."""
    async for session in get_db_session():
        yield session
'''

BACKEND_CLUB_REGISTRY = '''"""
Club configuration registry.

Loads club-specific configuration from JSON files.
Supports multi-tenant: different clubs, different configs.
"""

from __future__ import annotations

import json
from pathlib import Path
from functools import lru_cache
from typing import Any

CONFIGS_DIR = Path(__file__).parent / "clubs"


@lru_cache
def get_club_config(club_name: str) -> dict[str, Any]:
    """Load club configuration from JSON file."""
    config_file = CONFIGS_DIR / f"{{club_name}}.json"
    if not config_file.exists():
        raise FileNotFoundError(
            f"Club config not found: {{config_file}}. "
            f"Available: {{[f.stem for f in CONFIGS_DIR.glob('*.json')]}}"
        )
    with open(config_file, encoding="utf-8") as f:
        return json.load(f)


def list_available_clubs() -> list[str]:
    """List all configured clubs."""
    return [f.stem for f in CONFIGS_DIR.glob("*.json")]
'''

BACKEND_DB_CONNECTION = '''"""
Database connection management.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from club_mcp.config.settings import get_settings


def get_engine():
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        echo=settings.club_env == "development",
        pool_size=20,
        max_overflow=10,
    )


def get_session_factory():
    engine = get_engine()
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session():
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
'''

BACKEND_DB_BASE = '''"""
SQLAlchemy base model with common fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all database models."""

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
'''

BACKEND_AGENT_BASE = '''"""
Base agent class for all MCP agents.

Provides common functionality: tool registration, HITL integration,
cross-agent communication, and prompt management.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable
from enum import Enum

from pydantic import BaseModel, Field

from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.hitl.approval_engine import ApprovalEngine

logger = logging.getLogger(__name__)


class ToolDefinition(BaseModel):
    """Definition of a tool that an agent exposes."""
    name: str
    description: str
    handler: Callable
    approval_level: ApprovalLevel = ApprovalLevel.AUTO
    approver_roles: list[str] = Field(default_factory=list)
    requires_reason: bool = False
    dual_approval_above: float | None = None
    parameters_schema: dict[str, Any] = Field(default_factory=dict)


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the MCP server.

    All agents must:
    1. Define agent_name and description
    2. Implement _register_tools()
    3. Define their tools with appropriate approval levels
    """

    agent_name: str
    description: str
    club_name: str = ""

    def __init__(self) -> None:
        self.tools: list[ToolDefinition] = []
        self.approval_engine = ApprovalEngine()
        self._mcp: Any = None

    def register_tool(self, tool_def: ToolDefinition) -> None:
        """Register a tool with this agent."""
        self.tools.append(tool_def)
        logger.debug(
            f"[{{self.agent_name}}] Registered tool: {{tool_def.name}} "
            f"(approval: {{tool_def.approval_level.value}})"
        )

    def register_with_mcp(self, mcp: Any) -> None:
        """Register all tools with the MCP server."""
        self._mcp = mcp
        self._register_tools()
        for tool_def in self.tools:
            mcp.tool(
                name=f"{{self.agent_name}}__{{tool_def.name}}",
                description=f"[{{self.agent_name}}] {{tool_def.description}}",
            )(tool_def.handler)
        logger.info(
            f"[{{self.agent_name}}] Registered {{len(self.tools)}} tools with MCP"
        )

    @abstractmethod
    def _register_tools(self) -> None:
        """Register all tools. Must be implemented by each agent."""
        ...

    async def request_approval(
        self,
        tool_name: str,
        params: dict[str, Any],
        requested_by: str,
        approval_level: ApprovalLevel,
        **kwargs,
    ) -> Any:
        """Route a tool call through the approval engine."""
        return await self.approval_engine.create_request(
            agent=self.agent_name,
            tool=tool_name,
            params=params,
            requested_by=requested_by,
            approval_level=approval_level,
            **kwargs,
        )

    def get_cross_agent(self, agent_name: str) -> "BaseAgent":
        """Get another agent for cross-agent communication."""
        # Implemented by the orchestrator
        raise NotImplementedError("Cross-agent calls go through the orchestrator")
'''


# ════════════════════════════════════════════════════════════════
# HITL (Human-in-the-Loop) FILES
# ════════════════════════════════════════════════════════════════

HITL_TYPES = '''"""
Human-in-the-Loop approval types and levels.
"""

from __future__ import annotations

from enum import Enum
from datetime import datetime, timedelta
from pydantic import BaseModel, Field


class ApprovalLevel(str, Enum):
    """Levels of human approval required for tool execution."""

    AUTO = "auto"
    """Executes directly, no approval needed."""

    SEMI_AUTO = "semi_auto"
    """Executes, then notifies admin for review."""

    HITL = "hitl"
    """PAUSES execution, waits for approval."""

    ALWAYS_HUMAN = "always_human"
    """NEVER executes automatically. Always needs human approval."""


class ApprovalStatus(str, Enum):
    """Status of an approval request."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApprovalRequest(BaseModel):
    """A request for human approval."""

    request_id: str
    agent: str
    tool: str
    params: dict
    requested_by: str
    approval_level: ApprovalLevel
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: str | None = None
    approval_note: str | None = None
    expires_at: datetime | None = None

    # Context for the approver
    risk_summary: str = ""
    estimated_impact: str = ""
    affected_count: int = 0

    # Dual approval tracking
    requires_dual_approval: bool = False
    first_approval_by: str | None = None
    second_approval_by: str | None = None
'''

HITL_ENGINE = '''"""
Approval engine for Human-in-the-Loop workflows.
"""

from __future__ import annotations

import uuid
import logging
from datetime import datetime, timedelta

from club_mcp.hitl.approval_types import (
    ApprovalLevel,
    ApprovalRequest,
    ApprovalStatus,
)

logger = logging.getLogger(__name__)

# Approval expiry times by level
EXPIRY_TIMES = {
    ApprovalLevel.AUTO: None,
    ApprovalLevel.SEMI_AUTO: timedelta(hours=72),
    ApprovalLevel.HITL: timedelta(hours=48),
    ApprovalLevel.ALWAYS_HUMAN: timedelta(hours=72),
}


class ApprovalEngine:
    """Manages approval requests for HITL tools."""

    def __init__(self) -> None:
        self._pending_requests: dict[str, ApprovalRequest] = {{}}

    async def create_request(
        self,
        agent: str,
        tool: str,
        params: dict,
        requested_by: str,
        approval_level: ApprovalLevel,
        risk_summary: str = "",
        estimated_impact: str = "",
        affected_count: int = 0,
        approver_roles: list[str] | None = None,
        dual_approval_above: float | None = None,
    ) -> ApprovalRequest:
        """Create a new approval request."""
        request = ApprovalRequest(
            request_id=str(uuid.uuid4()),
            agent=agent,
            tool=tool,
            params=params,
            requested_by=requested_by,
            approval_level=approval_level,
            risk_summary=risk_summary,
            estimated_impact=estimated_impact,
            affected_count=affected_count,
            expires_at=datetime.utcnow() + EXPIRY_TIMES.get(
                approval_level, timedelta(hours=48)
            ),
        )

        self._pending_requests[request.request_id] = request

        logger.info(
            f"[HITL] Request created: {{request.request_id}} | "
            f"Agent: {{agent}} | Tool: {{tool}} | Level: {{approval_level.value}}"
        )

        # TODO: Persist to database
        # TODO: Notify approvers via NotificationAgent

        return request

    async def approve(
        self, request_id: str, approved_by: str, note: str = ""
    ) -> ApprovalRequest:
        """Approve a pending request."""
        request = self._pending_requests.get(request_id)
        if not request:
            raise ValueError(f"Request not found: {{request_id}}")

        request.status = ApprovalStatus.APPROVED
        request.approved_by = approved_by
        request.approval_note = note

        logger.info(
            f"[HITL] Approved: {{request_id}} by {{approved_by}}"
        )

        # TODO: Trigger original tool execution
        # TODO: Notify requester of approval

        return request

    async def reject(
        self, request_id: str, rejected_by: str, reason: str = ""
    ) -> ApprovalRequest:
        """Reject a pending request."""
        request = self._pending_requests.get(request_id)
        if not request:
            raise ValueError(f"Request not found: {{request_id}}")

        request.status = ApprovalStatus.REJECTED
        request.approval_note = reason

        logger.info(
            f"[HITL] Rejected: {{request_id}} by {{rejected_by}} | Reason: {{reason}}"
        )

        # TODO: Notify requester of rejection

        return request

    async def get_pending_requests(
        self, approver_role: str | None = None
    ) -> list[ApprovalRequest]:
        """Get all pending approval requests."""
        return [
            r for r in self._pending_requests.values()
            if r.status == ApprovalStatus.PENDING
        ]
'''

HITL_NOTIFIER = '''"""
Notification system for HITL approval requests.
"""

from __future__ import annotations

import logging

from club_mcp.hitl.approval_types import ApprovalRequest

logger = logging.getLogger(__name__)


class HITLNotifier:
    """Sends notifications about approval requests to approvers."""

    async def notify_approvers(self, request: ApprovalRequest) -> None:
        """Notify all relevant approvers about a new request."""
        logger.info(
            f"[HITL-Notify] Notifying approvers for request {{request.request_id}}"
        )
        # TODO: Send email
        # TODO: Send push notification
        # TODO: Update dashboard via WebSocket

    async def notify_requester_approved(self, request: ApprovalRequest) -> None:
        """Notify the requester that their request was approved."""
        logger.info(
            f"[HITL-Notify] Notifying requester of approval: {{request.request_id}}"
        )

    async def notify_requester_rejected(self, request: ApprovalRequest) -> None:
        """Notify the requester that their request was rejected."""
        logger.info(
            f"[HITL-Notify] Notifying requester of rejection: {{request.request_id}}"
        )
'''


# ════════════════════════════════════════════════════════════════
# AI / OLLAMA FILES
# ════════════════════════════════════════════════════════════════

AI_OLLAMA_CLIENT = '''"""
Ollama client for local LLM inference.
"""

from __future__ import annotations

import logging
from typing import Any

import ollama

from club_mcp.config.settings import get_settings

logger = logging.getLogger(__name__)


class OllamaClient:
    """Async client for Ollama LLM server."""

    def __init__(self) -> None:
        settings = get_settings()
        self.client = ollama.AsyncClient(host=settings.ollama_host)
        self.fast_model = settings.ollama_fast_model
        self.smart_model = settings.ollama_smart_model

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        tools: list[dict] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Send a chat request to Ollama."""
        model = model or self.fast_model

        options = {
            "temperature": temperature,
            "num_predict": max_tokens,
        }

        try:
            response = await self.client.chat(
                model=model,
                messages=messages,
                tools=tools,
                options=options,
            )
            return response
        except Exception as e:
            logger.error(f"Ollama error: {{e}}")
            raise

    async def generate_simple(
        self, prompt: str, system: str = "", model: str | None = None
    ) -> str:
        """Simple text generation."""
        messages = []
        if system:
            messages.append({{"role": "system", "content": system}})
        messages.append({{"role": "user", "content": prompt}})

        response = await self.chat(messages=messages, model=model)
        return response["message"]["content"]
'''

AI_LLM_ROUTER = '''"""
LLM Router: decides which model to use based on task complexity.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from club_mcp.ai.ollama_client import OllamaClient

logger = logging.getLogger(__name__)


@dataclass
class RoutingDecision:
    model: str
    complexity: float
    reason: str


class LLMRouter:
    """
    Routes tasks to the appropriate model:
    - Simple tasks (routing, classification) -> fast model (7B)
    - Complex tasks (planning, analysis) -> smart model (32B)
    - Critical tasks (if cloud enabled) -> cloud API (optional)
    """

    def __init__(self, ollama_client: OllamaClient) -> None:
        self.ollama = ollama_client
        self.threshold_simple = 0.3
        self.threshold_complex = 0.7

    async def classify_complexity(self, task: str) -> float:
        """Use fast model to estimate task complexity."""
        response = await self.ollama.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Rate this task complexity from 0.0 to 1.0. "
                        "0.0 = simple lookup, 1.0 = complex analysis/planning. "
                        "Output ONLY the number."
                    ),
                },
                {{"role": "user", "content": task}},
            ],
            model=self.ollama.fast_model,
            temperature=0.1,
            max_tokens=10,
        )
        try:
            return float(response["message"]["content"].strip())
        except (ValueError, KeyError):
            return 0.5

    async def route(self, task: str) -> RoutingDecision:
        """Decide which model to use for a given task."""
        complexity = await self.classify_complexity(task)

        if complexity < self.threshold_simple:
            return RoutingDecision(
                model=self.ollama.fast_model,
                complexity=complexity,
                reason="Simple task - using fast model",
            )
        else:
            return RoutingDecision(
                model=self.ollama.smart_model,
                complexity=complexity,
                reason="Complex task - using smart model",
            )
'''

AI_EMBEDDINGS = '''"""
Embeddings for semantic search and recommendations.
Uses Ollama for local embedding generation.
"""

from __future__ import annotations

import logging

import ollama

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate and manage embeddings for semantic search."""

    def __init__(self, host: str = "http://localhost:11434") -> None:
        self.client = ollama.AsyncClient(host=host)
        self.model = "nomic-embed-text"  # Good multilingual embedding model

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        response = await self.client.embeddings(
            model=self.model,
            prompt=text,
        )
        return response["embedding"]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        embeddings = []
        for text in texts:
            emb = await self.embed_text(text)
            embeddings.append(emb)
        return embeddings
'''


# ════════════════════════════════════════════════════════════════
# API FILES
# ════════════════════════════════════════════════════════════════

API_APP = '''"""
FastAPI application for HTTP endpoints + WebSocket.
Works alongside the MCP server.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from club_mcp.config.settings import get_settings
from club_mcp.api.routes import families, events, financial, hitl, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    settings = get_settings()
    # TODO: Initialize DB, Redis, Ollama connections
    yield
    # TODO: Cleanup connections


app = FastAPI(
    title="Club Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(families.router, prefix="/api/v1/families", tags=["Families"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(financial.router, prefix="/api/v1/financial", tags=["Financial"])
app.include_router(hitl.router, prefix="/api/v1/approvals", tags=["Approvals"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])


@app.get("/health")
async def health_check():
    return {{"status": "healthy", "club": get_settings().club_name}}
'''

API_ROUTE_FAMILIES = '''"""Family management routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_families():
    return {{"families": [], "message": "TODO: Implement"}}
'''

API_ROUTE_EVENTS = '''"""Event management routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_events():
    return {{"events": [], "message": "TODO: Implement"}}
'''

API_ROUTE_FINANCIAL = '''"""Financial routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/dashboard")
async def financial_dashboard():
    return {{"dashboard": {{}}, "message": "TODO: Implement"}}
'''

API_ROUTE_HITL = '''"""Approval management routes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/pending")
async def list_pending_approvals():
    return {{"approvals": [], "message": "TODO: Implement"}}


@router.post("/{{request_id}}/approve")
async def approve_request(request_id: str):
    return {{"status": "approved", "request_id": request_id}}


@router.post("/{{request_id}}/reject")
async def reject_request(request_id: str):
    return {{"status": "rejected", "request_id": request_id}}
'''

API_ROUTE_CHAT = '''"""Chat/conversation routes for the AI assistant."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/message")
async def send_message():
    return {{"response": "TODO: Connect to MCP server"}}
'''


# ════════════════════════════════════════════════════════════════
# ORCHESTRATOR FILES
# ════════════════════════════════════════════════════════════════

ORCHESTRATOR_ROUTER = '''"""
Request router: determines which agent(s) handle a request.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class AgentRouter:
    """Routes incoming requests to the appropriate agent(s)."""

    def __init__(self) -> None:
        self._agents: dict[str, any] = {{}}

    def register_agent(self, name: str, agent) -> None:
        self._agents[name] = agent

    async def route(self, user_message: str, context: dict) -> dict:
        """Route a user message to the right agent."""
        # Step 1: Use LLM to classify intent -> agent
        # Step 2: Use LLM to extract tool + params
        # Step 3: Execute tool (with HITL check)
        # Step 4: Format response with club persona
        raise NotImplementedError("Implement routing logic")
'''

ORCHESTRATOR_CONTEXT = '''"""
Context management for conversations and sessions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ConversationContext:
    """Manages context for a single conversation/session."""

    session_id: str
    family_id: str | None = None
    club_name: str = ""
    current_agent: str | None = None
    history: list[dict] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Injected context
    family_profile: dict | None = None
    upcoming_events: list[dict] = field(default_factory=list)
    recent_activity: list[dict] = field(default_factory=list)

    def add_message(self, role: str, content: str) -> None:
        self.history.append({{
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        }})

    def get_context_summary(self) -> str:
        """Build a context summary for the LLM."""
        parts = [f"Club: {{self.club_name}}"]
        if self.family_profile:
            parts.append(f"Family: {{self.family_profile.get('name', 'Unknown')}}")
        return " | ".join(parts)
'''

ORCHESTRATOR_FLOWS = '''"""
Multi-agent orchestration flows.
Complex workflows that involve multiple agents.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class FlowOrchestrator:
    """Orchestrates complex multi-agent workflows."""

    async def create_event_flow(self, event_config: dict) -> dict:
        """
        Flow: Create a major event
        Agents involved: EventOrchestrator -> AgeGroup -> Facility ->
                         Financial -> Communication
        """
        raise NotImplementedError("Implement event creation flow")

    async def welcome_family_flow(self, family_data: dict) -> dict:
        """
        Flow: Welcome a new family
        Agents involved: Family -> AgeGroup -> Recommender ->
                         Communication -> Financial
        """
        raise NotImplementedError("Implement welcome flow")

    async def weekly_digest_flow(self) -> dict:
        """
        Flow: Generate and send weekly digest
        Agents involved: Recommender -> AgeGroup -> Communication
        """
        raise NotImplementedError("Implement weekly digest flow")
'''

ORCHESTRATOR_EVENT_BUS = '''"""
Internal event bus for agent communication.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


class EventBus:
    """Simple async event bus for inter-agent communication."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[Callable]] = {{}}

    def subscribe(self, event_type: str, handler: Callable) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event_type: str, data: dict[str, Any]) -> None:
        handlers = self._handlers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Event handler error for {{event_type}}: {{e}}")


# Global event bus instance
event_bus = EventBus()
'''


# ════════════════════════════════════════════════════════════════
# NOTIFICATIONS FILES
# ════════════════════════════════════════════════════════════════

NOTIF_EMAIL = '''"""Email notification service."""

# TODO: Implement with SMTP or SendGrid
'''

NOTIF_PUSH = '''"""Push notification service."""

# TODO: Implement with Firebase Cloud Messaging
'''

NOTIF_WHATSAPP = '''"""WhatsApp Business API notification service."""

# TODO: Implement with WhatsApp Business API
'''


# ════════════════════════════════════════════════════════════════
# UTILS FILES
# ════════════════════════════════════════════════════════════════

UTILS_ID_GEN = '''"""ID generation utilities."""
import uuid
import secrets


def generate_id() -> str:
    return str(uuid.uuid4())


def generate_short_id(length: int = 8) -> str:
    return secrets.token_urlsafe(length)[:length]
'''

UTILS_DATE = '''"""Date and time helper utilities."""
from datetime import datetime, date


def today() -> date:
    return date.today()


def now() -> datetime:
    return datetime.utcnow()
'''

UTILS_VALIDATORS = '''"""Common validation utilities."""
import re


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{{2,}}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    cleaned = re.sub(r'[\\s\\-\\(\\)]', '', phone)
    return cleaned.isdigit() and 8 <= len(cleaned) <= 15
'''


# ════════════════════════════════════════════════════════════════
# TEST FILES
# ════════════════════════════════════════════════════════════════

TEST_CONFTEST = '''"""
Shared test fixtures.
"""

import pytest
import asyncio
from typing import AsyncGenerator


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def sample_family_data() -> dict:
    return {
        "family_name": "Familia García",
        "members": [
            {{"name": "Carlos García", "age": 42, "role": "adult"}},
            {{"name": "María García", "age": 39, "role": "adult"}},
            {{"name": "Sofía García", "age": 8, "role": "child"}},
            {{"name": "Diego García", "age": 14, "role": "teen"}},
        ],
        "membership_tier": "premium",
        "join_date": "2024-01-15",
    }
'''

TEST_FAMILY_AGENT = '''"""
Tests for FamilyProfileAgent.
"""

import pytest


class TestFamilyProfileAgent:

    @pytest.mark.asyncio
    async def test_create_family(self, sample_family_data):
        """Test creating a new family profile."""
        # TODO: Implement when agent is ready
        assert sample_family_data["family_name"] == "Familia García"

    @pytest.mark.asyncio
    async def test_get_family_profile(self):
        """Test retrieving a family profile."""
        # TODO: Implement
        pass

    @pytest.mark.asyncio
    async def test_update_family_members(self):
        """Test updating family members."""
        # TODO: Implement
        pass
'''

TEST_FIXTURE_FAMILIES = '''[
  {{
    "family_id": "fam-001",
    "name": "Familia García",
    "members": [
      {{"name": "Carlos García", "age": 42, "group": "adult"}},
      {{"name": "María López", "age": 39, "group": "adult"}},
      {{"name": "Sofía García", "age": 8, "group": "kids"}},
      {{"name": "Diego García", "age": 14, "group": "teens"}}
    ],
    "tier": "premium",
    "join_date": "2023-03-15",
    "engagement_score": 85
  }},
  {{
    "family_id": "fam-002",
    "name": "Familia Rodríguez",
    "members": [
      {{"name": "Andrés Rodríguez", "age": 55, "group": "adult"}},
      {{"name": "Laura Mora", "age": 52, "group": "adult"}}
    ],
    "tier": "basic",
    "join_date": "2022-08-01",
    "engagement_score": 62
  }},
  {{
    "family_id": "fam-003",
    "name": "Familia Chen",
    "members": [
      {{"name": "Wei Chen", "age": 38, "group": "adult"}},
      {{"name": "Ana Vargas", "age": 36, "group": "adult"}},
      {{"name": "Liam Chen", "age": 3, "group": "toddler"}},
      {{"name": "Emma Chen", "age": 6, "group": "kids"}}
    ],
    "tier": "premium",
    "join_date": "2024-01-10",
    "engagement_score": 91
  }}
]
'''


# ════════════════════════════════════════════════════════════════
# FRONTEND FILES
# ════════════════════════════════════════════════════════════════

FRONTEND_PACKAGE_JSON = """{
  "name": "club-platform-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "recharts": "^2.14.0",
    "framer-motion": "^11.12.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "~5.7.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "eslint": "^9.0.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0"
  }
}
"""

FRONTEND_VITE_CONFIG = '''import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
'''

FRONTEND_TAILWIND = '''import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        club: {
          primary: "{club.primary_color}",
          secondary: "{club.secondary_color}",
          accent: "{club.accent_color}",
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["DM Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
'''

FRONTEND_TSCONFIG = '''{
  "files": [],
  "references": [{{ "path": "./tsconfig.app.json" }}]
}
'''

FRONTEND_TSCONFIG_APP = '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
'''

FRONTEND_INDEX_HTML = '''<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
    <title>{club.display_name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'''

FRONTEND_ENV_EXAMPLE = """VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_CLUB_NAME={club.name}
"""

FRONTEND_GLOBALS_CSS = '''@import "tailwindcss";

@theme {{
  --color-club-primary: {club.primary_color};
  --color-club-secondary: {club.secondary_color};
  --color-club-accent: {club.accent_color};
  --font-family-display: "Cormorant Garamond", Georgia, serif;
  --font-family-body: "DM Mono", Menlo, monospace;
}}

/* Base styles */
body {{
  font-family: var(--font-family-body);
  background-color: #0d0d0d;
  color: #f0ece4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}

h1, h2, h3, h4, h5, h6 {{
  font-family: var(--font-family-display);
}}
'''

FRONTEND_MAIN = '''import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({{
  defaultOptions: {{
    queries: {{
      staleTime: 1000 * 60 * 5,
      retry: 2,
    }},
  }},
}});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={{queryClient}}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
'''

FRONTEND_APP = '''import {{ BrowserRouter, Routes, Route }} from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Families from "./pages/Families";
import Events from "./pages/Events";
import Calendar from "./pages/Calendar";
import Activities from "./pages/Activities";
import Financial from "./pages/Financial";
import Approvals from "./pages/Approvals";
import Chatbot from "./pages/Chatbot";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {{
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={{<Login />}} />
        <Route element={{<Layout />}}>
          <Route index element={{<Dashboard />}} />
          <Route path="/families" element={{<Families />}} />
          <Route path="/events" element={{<Events />}} />
          <Route path="/calendar" element={{<Calendar />}} />
          <Route path="/activities" element={{<Activities />}} />
          <Route path="/financial" element={{<Financial />}} />
          <Route path="/approvals" element={{<Approvals />}} />
          <Route path="/chat" element={{<Chatbot />}} />
          <Route path="*" element={{<NotFound />}} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}}
'''

FRONTEND_VITE_ENV = '''/// <reference types="vite/client" />

interface ImportMetaEnv {{
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_CLUB_NAME: string;
}}

interface ImportMeta {{
  readonly env: ImportMetaEnv;
}}
'''

FRONTEND_SIDEBAR = '''import {{ NavLink }} from "react-router-dom";
import {{
  Home, Users, CalendarDays, Activity, DollarSign,
  CheckCircle, MessageCircle, Settings,
}} from "lucide-react";

const navItems = [
  {{ to: "/", icon: Home, label: "Dashboard" }},
  {{ to: "/families", icon: Users, label: "Familias" }},
  {{ to: "/events", icon: CalendarDays, label: "Eventos" }},
  {{ to: "/calendar", icon: CalendarDays, label: "Calendario" }},
  {{ to: "/activities", icon: Activity, label: "Actividades" }},
  {{ to: "/financial", icon: DollarSign, label: "Finanzas" }},
  {{ to: "/approvals", icon: CheckCircle, label: "Aprobaciones" }},
  {{ to: "/chat", icon: MessageCircle, label: "Asistente" }},
];

export default function Sidebar() {{
  return (
    <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] p-4 flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h1 className="text-xl font-display font-bold text-club-primary">
          {club.display_name}
        </h1>
        <p className="text-xs text-[#7a7570] font-body">Panel de Control</p>
      </div>
      <nav className="flex-1 py-4 space-y-1">
        {{navItems.map((item) => (
          <NavLink
            key={{item.to}}
            to={{item.to}}
            end={{item.to === "/"}}
            className={{({{ isActive }}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body transition-colors ${{
                isActive ? "bg-club-primary/20 text-club-primary" : "text-[#7a7570] hover:text-[#f0ece4] hover:bg-[#2a2a2a]"
              }}`
            }}
          >
            <item.icon size={{18}} />
            {{item.label}}
          </NavLink>
        ))}}
      </nav>
    </aside>
  );
}}
'''

FRONTEND_HEADER = '''import {{ Bell, Search, User }} from "lucide-react";

export default function Header() {{
  return (
    <header className="h-16 border-b border-[#2a2a2a] px-6 flex items-center justify-between bg-[#1a1a1a]">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7570]" size={{18}} />
          <input
            type="text"
            placeholder="Buscar familias, eventos..."
            className="w-full pl-10 pr-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-club-primary"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
          <Bell size={{20}} className="text-[#7a7570]" />
        </button>
        <button className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
          <User size={{20}} className="text-[#7a7570]" />
        </button>
      </div>
    </header>
  );
}}
'''

FRONTEND_LAYOUT = '''import {{ Outlet }} from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {{
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f0ece4] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}}
'''

FRONTEND_API_SERVICE = '''/**
 * API service layer for communicating with the backend.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

class ApiService {{
  private baseUrl: string;

  constructor(baseUrl: string) {{
    this.baseUrl = baseUrl;
  }}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {{}}
  ): Promise<T> {{
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {{
      "Content-Type": "application/json",
      ...(token ? {{ Authorization: `Bearer ${{token}}` }} : {{}}),
      ...options.headers,
    }};

    const response = await fetch(`${{this.baseUrl}}${{endpoint}}`, {{
      ...options,
      headers,
    }});

    if (!response.ok) {{
      throw new Error(`API Error: ${{response.status}} ${{response.statusText}}`);
    }}

    return response.json();
  }}

  async get<T>(endpoint: string): Promise<T> {{
    return this.request(endpoint);
  }}

  async post<T>(endpoint: string, data: unknown): Promise<T> {{
    return this.request(endpoint, {{
      method: "POST",
      body: JSON.stringify(data),
    }});
  }}

  async put<T>(endpoint: string, data: unknown): Promise<T> {{
    return this.request(endpoint, {{
      method: "PUT",
      body: JSON.stringify(data),
    }});
  }}

  async delete<T>(endpoint: string): Promise<T> {{
    return this.request(endpoint, {{ method: "DELETE" }});
  }}
}}

export const api = new ApiService(API_URL);
'''

FRONTEND_MCP_CLIENT = '''/**
 * MCP WebSocket client for real-time communication.
 */

type MessageHandler = (data: unknown) => void;

class McpClient {{
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();

  connect(url: string) {{
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {{
      const data = JSON.parse(event.data);
      const handlers = this.handlers.get(data.type) || [];
      handlers.forEach((h) => h(data));
    }};
  }}

  on(type: string, handler: MessageHandler) {{
    if (!this.handlers.has(type)) {{
      this.handlers.set(type, []);
    }}
    this.handlers.get(type)!.push(handler);
  }}

  send(type: string, payload: unknown) {{
    this.ws?.send(JSON.stringify({{ type, payload }}));
  }}

  disconnect() {{
    this.ws?.close();
  }}
}}

export const mcpClient = new McpClient();
'''


# ════════════════════════════════════════════════════════════════
# DOCKER FILES
# ════════════════════════════════════════════════════════════════

DOCKER_BACKEND = '''FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy and install dependencies
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend/src ./src
COPY backend/alembic.ini ./

CMD ["uv", "run", "uvicorn", "club_mcp.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
'''

DOCKER_FRONTEND = '''FROM node:22-alpine AS build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
'''

DOCKER_NGINX = '''server {{
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {{
    try_files $uri $uri/ /index.html;
  }}

  location /api {{
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }}

  location /ws {{
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }}
}}
'''


# ════════════════════════════════════════════════════════════════
# SCRIPTS
# ════════════════════════════════════════════════════════════════

SCRIPTS_SETUP = '''#!/bin/bash
set -e

echo "🏡 Setting up {club.display_name} Platform..."

# Check dependencies
command -v uv >/dev/null 2>&1 || {{ echo "Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }}
command -v node >/dev/null 2>&1 || {{ echo "Install Node.js 22+"; exit 1; }}
command -v docker >/dev/null 2>&1 || {{ echo "Install Docker"; exit 1; }}

# Backend setup
echo "📦 Setting up backend..."
cd backend && uv sync && cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend && npm install && cd ..

# Docker services
echo "🐳 Starting Docker services..."
docker compose up -d postgres redis ollama

# Pull AI model
echo "🤖 Pulling Qwen 2.5 model..."
docker compose exec ollama ollama pull qwen2.5:7b

echo ""
echo "✅ Setup complete!"
echo ""
echo "Run 'make dev' to start the development server."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
'''

SCRIPTS_SEED = '''"""
Seed script: populates the database with initial data for {club.display_name}.
"""

import json
import asyncio
from pathlib import Path


async def seed_families():
    """Load seed family data."""
    seed_file = Path(__file__).parent.parent / "seeds" / "{club.name}_families.json"
    with open(seed_file) as f:
        families = json.load(f)
    print(f"Seeding {{len(families)}} families...")
    # TODO: Insert into database


async def seed_events():
    """Load seed event data."""
    seed_file = Path(__file__).parent.parent / "seeds" / "{club.name}_events.json"
    with open(seed_file) as f:
        events = json.load(f)
    print(f"Seeding {{len(events)}} events...")
    # TODO: Insert into database


async def seed_activities():
    """Load seed activity data."""
    seed_file = Path(__file__).parent.parent / "seeds" / "{club.name}_activities.json"
    with open(seed_file) as f:
        activities = json.load(f)
    print(f"Seeding {{len(activities)}} activities...")
    # TODO: Insert into database


async def main():
    print("🌱 Seeding {club.display_name} database...")
    await seed_families()
    await seed_events()
    await seed_activities()
    print("✅ Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
'''

SCRIPTS_START_DEV = '''#!/bin/bash
echo "🚀 Starting development environment..."
docker compose up -d postgres redis ollama
echo "⏳ Waiting for services..."
sleep 5
echo "🔧 Starting backend..."
cd backend && uv run uvicorn club_mcp.api.app:app --reload --port 8000 &
echo "⚛️ Starting frontend..."
cd frontend && npm run dev &
wait
'''


# ════════════════════════════════════════════════════════════════
# SEED DATA GENERATORS
# ════════════════════════════════════════════════════════════════

def generate_seed_families(club: ClubConfig) -> str:
    families = [
        {
            "family_id": "fam-001",
            "name": "Familia García",
            "members": [
                {"name": "Carlos García", "age": 42, "group": "adult"},
                {"name": "María López", "age": 39, "group": "adult"},
                {"name": "Sofía García", "age": 8, "group": "kids"},
                {"name": "Diego García", "age": 14, "group": "teens"},
            ],
            "tier": "premium",
            "join_date": "2023-03-15",
            "engagement_score": 85,
        },
        {
            "family_id": "fam-002",
            "name": "Familia Rodríguez",
            "members": [
                {"name": "Andrés Rodríguez", "age": 55, "group": "adult"},
                {"name": "Laura Mora", "age": 52, "group": "adult"},
                {"name": "Valentina Rodríguez", "age": 25, "group": "young"},
            ],
            "tier": "basic",
            "join_date": "2022-08-01",
            "engagement_score": 62,
        },
        {
            "family_id": "fam-003",
            "name": "Familia Chen-Vargas",
            "members": [
                {"name": "Wei Chen", "age": 38, "group": "adult"},
                {"name": "Ana Vargas", "age": 36, "group": "adult"},
                {"name": "Liam Chen", "age": 3, "group": "toddler"},
                {"name": "Emma Chen", "age": 6, "group": "kids"},
            ],
            "tier": "premium",
            "join_date": "2024-01-10",
            "engagement_score": 91,
        },
        {
            "family_id": "fam-004",
            "name": "Familia Quirós",
            "members": [
                {"name": "Roberto Quirós", "age": 68, "group": "senior"},
                {"name": "Elena Quirós", "age": 65, "group": "senior"},
            ],
            "tier": "vip",
            "join_date": "2020-03-01",
            "engagement_score": 78,
        },
    ]
    return json.dumps(families, indent=2, ensure_ascii=False)


def generate_seed_events(club: ClubConfig) -> str:
    events = [
        {
            "event_id": "evt-001",
            "name": f"Navidad en {'la Montaña' if club.club_type == 'mountain' else 'la Playa'}",
            "type": "SEASONAL",
            "date": "2025-12-20",
            "pricing": "SUBSIDIZED",
            "target_groups": ["toddler", "kids", "teens", "young", "adult", "senior", "family"],
            "capacity": 3500,
            "description": "La fiesta navideña más esperada del año",
        },
        {
            "event_id": "evt-002",
            "name": "Día del Socio",
            "type": "CLUB_CELEBRATION",
            "date": "2025-08-15",
            "pricing": "FREE",
            "target_groups": ["family"],
            "capacity": 5000,
            "description": "Celebración especial para todos nuestros socios",
        },
    ]
    return json.dumps(events, indent=2, ensure_ascii=False)


def generate_seed_activities(club: ClubConfig) -> str:
    activities = []
    for group, group_activities in club.age_group_activities.items():
        for i, activity in enumerate(group_activities):
            activities.append({
                "activity_id": f"act-{group}-{i+1:03d}",
                "name": activity.replace("_", " ").title(),
                "age_group": group,
                "type": "recurring_weekly",
                "pricing": "FREE" if i % 3 == 0 else "PAID",
                "capacity": 30 if group in ["kids", "teens"] else 50,
            })
    return json.dumps(activities, indent=2, ensure_ascii=False)


# ════════════════════════════════════════════════════════════════
# DOCUMENTATION FILES
# ════════════════════════════════════════════════════════════════

DOCS_ARCHITECTURE = """# Architecture

## Overview

Club Platform is a multi-agent MCP server for private club management.

Frontend (React) → FastAPI → MCP Server → 11 Agents → Database
↓
Ollama (Qwen 2.5)


## Agents

11 specialized agents, each owning a domain and exposing tools via MCP.

## Data Flow

1. User interacts via React frontend
2. Frontend sends to FastAPI HTTP endpoint or MCP WebSocket
3. MCP Server routes to appropriate agent(s)
4. Agent executes tool (with HITL if needed)
5. Response flows back through the chain

## Multi-Tenant

Each club gets its own configuration file in `config/clubs/`.
Core logic is shared; branding, facilities, activities, and prompts differ.
"""

DOCS_API = """# API Documentation

## Endpoints

### Families
- `GET /api/v1/families` - List families
- `GET /api/v1/families/:id` - Get family detail
- `POST /api/v1/families` - Create family

### Events
- `GET /api/v1/events` - List events
- `GET /api/v1/events/:id` - Event detail
- `POST /api/v1/events` - Create event (HITL)

### Financial
- `GET /api/v1/financial/dashboard` - Financial overview
- `GET /api/v1/financial/family/:id` - Family billing

### Approvals (HITL)
- `GET /api/v1/approvals/pending` - List pending approvals
- `POST /api/v1/approvals/:id/approve` - Approve request
- `POST /api/v1/approvals/:id/reject` - Reject request

### Chat
- `POST /api/v1/chat/message` - Send message to AI assistant
"""

DOCS_AGENTS = """# Agents Documentation

| # | Agent | Tools | HITL Tools |
|---|-------|-------|-----------|
| 1 | FamilyProfileAgent | 7 | 2 |
| 2 | EventOrchestratorAgent | 9 | 4 |
| 3 | AgeGroupAgent | 7 | 1 |
| 4 | FinancialAgent | 9 | 5 |
| 5 | SportsRecreationAgent | 7 | 2 |
| 6 | CulturalSocialAgent | 6 | 2 |
| 7 | CommunicationAgent | 7 | 3 |
| 8 | FacilityManagementAgent | 7 | 2 |
| 9 | MemberEngagementAgent | 6 | 2 |
| 10 | GuestManagementAgent | 5 | 2 |
| 11 | ProactiveRecommendationAgent | 8 | 2 |
| **TOTAL** | | **78** | **27** |

See each agent file for detailed tool documentation.
"""

DOCS_MULTI_TENANT = """# Multi-Tenant Architecture

## Current Club: {club.display_name}
- Type: {club.club_type}
- Country: {club.country}

## Adding a New Club

1. Create a new config file: `config/clubs/<club_name>.json`
2. Define: facilities, activities, events, branding
3. Update `.env` with `CLUB_NAME=<club_name>`
4. Restart

## What Changes Between Clubs

| Component | Changes? |
|-----------|----------|
| Agent logic | No |
| Database schema | No |
| Frontend components | No |
| Club config JSON | **Yes** |
| Branding (colors, fonts) | **Yes** |
| Prompts (tono, emojis) | **Yes** |
| Activities catalog | **Yes** |
| Event calendar | **Yes** |
| Facilities map | **Yes** |
"""

DOCS_DEPLOYMENT = """# Deployment

## Development
```bash
make dev"""