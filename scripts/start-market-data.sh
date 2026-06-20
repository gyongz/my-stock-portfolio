#!/bin/bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${ROOT_DIR}/.venv/market-data/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Python market data environment is missing. Run: pnpm market-data:setup" >&2
  exit 1
fi

exec "${PYTHON_BIN}" -m uvicorn app:app \
  --app-dir "${ROOT_DIR}/services/market-data" \
  --host "${MARKET_DATA_SERVICE_HOST:-127.0.0.1}" \
  --port "${MARKET_DATA_SERVICE_PORT:-8001}"
