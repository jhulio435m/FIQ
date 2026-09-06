#!/usr/bin/env sh
set -eu

interval_seconds="${FIQ_WATCHER_INTERVAL_SECONDS:-60}"
config_file="${FIQ_WATCHER_CONFIG:-/etc/fiq-watcher/watcher.env}"

while true; do
  /opt/fiq-watcher/watch_fiq_endpoints.sh "${config_file}" || true
  sleep "${interval_seconds}"
done
