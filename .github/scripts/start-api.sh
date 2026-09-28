#!/usr/bin/env bash
# Starts (or restarts) Client.Gateway.Api in the background on $API_URL and
# waits for /health. Restarting resets the in-memory rate limiter, so each
# test run gets a fresh 100 req/min window. Expects a prior
# `dotnet build Client.Gateway.Api -c Release`.
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:5199}"
PID_FILE=".api.pid"

if [[ -f "$PID_FILE" ]]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  sleep 2
fi

# Run the built DLL directly (not `dotnet run`) so $! is the API process itself
# and a restart actually frees the port. URLs go via ASPNETCORE_URLS because
# ApiHostFactory clears config sources, dropping command-line args like --urls.
ASPNETCORE_URLS="$API_URL" nohup dotnet \
  Client.Gateway.Api/bin/Release/net10.0/Client.Gateway.Api.dll >> api.log 2>&1 &
echo $! > "$PID_FILE"

for _ in $(seq 1 60); do
  if curl -sf "$API_URL/health" > /dev/null; then
    echo "API is up at $API_URL"
    exit 0
  fi
  sleep 1
done

echo "API did not become healthy within 60s" >&2
cat api.log >&2
exit 1
