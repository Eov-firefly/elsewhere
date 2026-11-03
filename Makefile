export UV_CACHE_DIR := $(CURDIR)/.local/uv-cache
.PHONY: install dev-up dev-down db-migrate seed-demo test build
install:
	uv sync --project apps/api --frozen
	cd apps/web && npm ci
dev-up:
	bash scripts/dev.sh
dev-down:
	bash scripts/stop.sh
db-migrate:
	cd apps/api && uv run alembic upgrade head
seed-demo:
	cd apps/api && uv run python -m app.seed
test:
	cd apps/api && uv run pytest -q
	cd apps/web && npm run typecheck
build:
	cd apps/web && npm run build
