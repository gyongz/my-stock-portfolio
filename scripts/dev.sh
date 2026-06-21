#!/bin/bash
set -Eeuo pipefail


PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"
MARKET_DATA_PID=""


cd "${COZE_WORKSPACE_PATH}"

if [[ -f "${COZE_WORKSPACE_PATH}/.env.production.local" ]]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.production.local"
    set +a
fi

if [[ -f "${COZE_WORKSPACE_PATH}/.env.local" ]]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.local"
    set +a
fi

if [[ -f "${COZE_WORKSPACE_PATH}/.env.development.local" ]]; then
    set -a
    source "${COZE_WORKSPACE_PATH}/.env.development.local"
    set +a
fi

start_market_data_service() {
    if [[ "${MARKET_DATA_SERVICE_AUTOSTART:-1}" != "1" ]]; then
      return
    fi
    local python_bin="${COZE_WORKSPACE_PATH}/.venv/market-data/bin/python"
    local service_url="${MARKET_DATA_SERVICE_URL:-http://127.0.0.1:8001}"
    local service_port="${MARKET_DATA_SERVICE_PORT:-8001}"
    if curl -fsS --max-time 2 "${service_url}/health" >/dev/null 2>&1; then
      echo "Python market data service is already running at ${service_url}."
      return
    fi
    if [[ ! -x "${python_bin}" ]]; then
      echo "Python market data service is not installed; run pnpm market-data:setup to enable AKShare/BaoStock/Tushare."
      return
    fi
    mkdir -p "${COZE_WORKSPACE_PATH}/logs"
    "${python_bin}" -m uvicorn app:app --app-dir "${COZE_WORKSPACE_PATH}/services/market-data" --host 127.0.0.1 --port "${service_port}" >> "${COZE_WORKSPACE_PATH}/logs/market-data.log" 2>&1 &
    MARKET_DATA_PID=$!
}

cleanup_market_data_service() {
    if [[ -n "${MARKET_DATA_PID}" ]]; then
      kill "${MARKET_DATA_PID}" >/dev/null 2>&1 || true
    fi
}

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for dev..."

trap cleanup_market_data_service EXIT INT TERM
start_market_data_service
PORT=${DEPLOY_RUN_PORT} pnpm tsx watch src/server.ts
