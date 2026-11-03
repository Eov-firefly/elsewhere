#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PWD/.local/uv-cache}"
if [ ! -f .env ]; then
  cp .env.example .env
  python3 - <<'PY'
from pathlib import Path
import secrets
p = Path('.env')
p.write_text(p.read_text().replace('ADMIN_TOKEN=\n', 'ADMIN_TOKEN=' + secrets.token_urlsafe(32) + '\n'))
p.chmod(0o600)
PY
fi
set -a
source .env
set +a
docker compose up -d --wait db
uv sync --project apps/api --frozen
(cd apps/api && uv run alembic upgrade head && uv run python -m app.seed)
if [ ! -d apps/web/node_modules ]; then (cd apps/web && npm ci); fi
# Foreground supervisor: terminate only children started by this invocation.
cleanup() { kill "${api_pid:-}" "${web_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd apps/api && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &
api_pid=$!
echo "$api_pid" > .local/api.pid
(cd apps/web && exec node node_modules/next/dist/bin/next dev --webpack --hostname 0.0.0.0) &
web_pid=$!
echo "$web_pid" > .local/web.pid
wait -n "$api_pid" "$web_pid"
