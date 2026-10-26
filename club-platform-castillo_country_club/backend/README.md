# Castillo Country Club — MCP Server

AI-powered management platform for private family clubs in Costa Rica.

## Architecture

- **Backend**: Python 3.12, FastMCP, FastAPI, SQLAlchemy 2.0
- **AI**: Ollama + Qwen 2.5 (local-first)
- **Database**: PostgreSQL 16 + pgvector + Redis 7
- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4

## Quick Start

```bash
# Install dependencies
uv sync

# Run tests
uv run pytest -v

# Run with coverage
uv run pytest --cov --cov-report=html

# Start server
uv run club-mcp
