#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"
MARKET_DATA_PID=""

if [[ -f "${COZE_WORKSPACE_PATH}/.env.production" ]]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.production"
    set +a
fi

if [[ -f "${COZE_WORKSPACE_PATH}/.env.production.local" ]]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.production.local"
    set +a
fi

start_market_data_service() {
    if [[ "${MARKET_DATA_SERVICE_AUTOSTART:-1}" != "1" ]]; then
        return
    fi
    local python_bin="${COZE_WORKSPACE_PATH}/.venv/market-data/bin/python"
    local service_url="${MARKET_DATA_SERVICE_URL:-http://127.0.0.1:8001}"
    local service_port="${MARKET_DATA_SERVICE_PORT:-8001}"
    if [[ "${service_url}" != http://127.0.0.1:* && "${service_url}" != http://localhost:* ]]; then
        echo "Using external Python market data service: ${service_url}"
        return
    fi
    if curl -fsS --max-time 2 "${service_url}/health" >/dev/null 2>&1; then
        echo "Python market data service is already running at ${service_url}."
        return
    fi
    if [[ ! -x "${python_bin}" ]]; then
        echo "Python market data service is not installed; run pnpm market-data:setup to enable AKShare/BaoStock/Tushare."
        return
    fi
    mkdir -p "${COZE_WORKSPACE_PATH}/logs"
    "${python_bin}" -m uvicorn app:app \
        --app-dir "${COZE_WORKSPACE_PATH}/services/market-data" \
        --host 127.0.0.1 \
        --port "${service_port}" \
        >> "${COZE_WORKSPACE_PATH}/logs/market-data.log" 2>&1 &
    MARKET_DATA_PID=$!
    for _ in {1..30}; do
        if curl -fsS --max-time 2 "${service_url}/health" >/dev/null 2>&1; then
            echo "Python market data service started at ${service_url}."
            return
        fi
        sleep 0.5
    done
    echo "Warning: Python market data service failed to start; see logs/market-data.log."
}

cleanup_market_data_service() {
    if [[ -n "${MARKET_DATA_PID}" ]]; then
        kill "${MARKET_DATA_PID}" >/dev/null 2>&1 || true
    fi
}


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
trap cleanup_market_data_service EXIT INT TERM
start_market_data_service
start_service
