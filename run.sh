#!/usr/bin/env bash
set -e
export PYTHONPATH="${PYTHONPATH}:$(pwd)/ai_service"
python3 -m uvicorn ai_service.main:app --host 127.0.0.1 --port 8001 &
AI_PID=$!
trap 'kill $AI_PID 2>/dev/null || true' EXIT
php -S 0.0.0.0:${PORT:-3000}
