#!/usr/bin/env sh
set -eu

if [ -f "${FIQ_WATCHER_CONFIG:-/etc/fiq-watcher/watcher.env}" ]; then
  set -a
  . "${FIQ_WATCHER_CONFIG:-/etc/fiq-watcher/watcher.env}"
  set +a
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN is not configured; bot container is idle."
  tail -f /dev/null
fi

exec python /opt/fiq-watcher/fiq_telegram_status_bot.py
