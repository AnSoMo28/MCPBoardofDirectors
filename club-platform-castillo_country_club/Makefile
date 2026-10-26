.PHONY: dev install test

dev:
	docker compose up -d
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"

install:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

test:
	cd backend && pytest -v
	cd frontend && npm test