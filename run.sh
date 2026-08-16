#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/ai_service"

if [[ -n "${DB_SSL_CA_PEM:-}" ]]; then
  printf '%s\n' "$DB_SSL_CA_PEM" > /tmp/radius-db-ca.pem
  chmod 600 /tmp/radius-db-ca.pem
  export DB_SSL_CA=/tmp/radius-db-ca.pem
fi

echo "Starting RADIUS AI service..."
python3 -m uvicorn ai_service.main:app --host 127.0.0.1 --port 8001 &
AI_PID=$!
trap 'kill "$AI_PID" 2>/dev/null || true' EXIT

echo "Waiting for AI service..."
WAITED=0
until curl -fsS http://127.0.0.1:8001/health >/dev/null 2>&1; do
  if ! kill -0 "$AI_PID" 2>/dev/null; then echo "AI service exited during startup." >&2; exit 1; fi
  if (( WAITED >= 120 )); then echo "AI service did not become ready within 120 seconds." >&2; exit 1; fi
  sleep 2; WAITED=$((WAITED+2))
done

echo "AI service ready. Starting PHP on port ${PORT:-3000}..."
exec php -S 0.0.0.0:${PORT:-3000}
