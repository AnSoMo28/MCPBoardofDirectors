# Castillo Country Club
AI Multi-Agent MCP Server for Private Club Management.

```bash
cd club-platform-castillo_country_club
python -m venv .venv
.venv\Scripts\activate.bat
cd backend && pip install -e ".[dev]"
cd ..\frontend && npm install
cd ..
docker compose up -d
make dev
```