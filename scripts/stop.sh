#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for service in api web; do
  file=".local/$service.pid"
  if [ -f "$file" ]; then
    pid=$(cat "$file")
    # Check ownership before terminating a possibly stale PID.
    case "$service:$(ps -p "$pid" -o args= 2>/dev/null || true)" in
      api:*uvicorn*|web:*node*next*) kill "$pid" 2>/dev/null || true ;;
    esac
    rm -f "$file"
  fi
done
docker compose stop db
