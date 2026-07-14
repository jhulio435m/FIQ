#!/usr/bin/env bash
set -euo pipefail

config_file="${1:-/etc/fiq-watcher/watcher.env}"

if [ -f "${config_file}" ]; then
  # shellcheck disable=SC1090
  source "${config_file}"
fi

targets="${FIQ_WATCHER_TARGETS:-}"
timeout_seconds="${FIQ_WATCHER_TIMEOUT_SECONDS:-10}"
metrics_file="${FIQ_WATCHER_METRICS_FILE:-/tmp/fiq-watcher.prom}"
log_file="${FIQ_WATCHER_LOG_FILE:-/tmp/fiq-watcher.log}"
dashboard_api_key="${DASHBOARD_API_KEY:-}"
alert_webhook_url="${FIQ_WATCHER_ALERT_WEBHOOK_URL:-}"

if [ -z "${targets}" ]; then
  echo "FIQ_WATCHER_TARGETS is required" >&2
  exit 2
fi

tmp_metrics="$(mktemp)"
failures=0
checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cleanup() {
  rm -f "${tmp_metrics}"
}
trap cleanup EXIT

write_metric() {
  printf '%s\n' "$1" >>"${tmp_metrics}"
}

send_alert() {
  local message="$1"

  if [ -z "${alert_webhook_url}" ]; then
    return
  fi

  curl --fail --silent --show-error \
    --connect-timeout 5 \
    --max-time 10 \
    --request POST \
    --header "Content-Type: application/json" \
    --data "{\"text\":\"${message}\"}" \
    "${alert_webhook_url}" >/dev/null || true
}

for target in ${targets}; do
  name="${target%%=*}"
  url="${target#*=}"
  request_url="${url}"
  result_file="$(mktemp)"

  if [ "${name}" = "${target}" ] || [ -z "${name}" ] || [ -z "${url}" ]; then
    echo "Invalid target entry: ${target}" >&2
    failures=$((failures + 1))
    rm -f "${result_file}"
    continue
  fi

  curl_args=(
    --silent
    --show-error
    --output /dev/null
    --write-out "%{http_code} %{time_total}"
    --connect-timeout "${timeout_seconds}"
    --max-time "${timeout_seconds}"
  )

  if [ -n "${dashboard_api_key}" ] && [[ "${url}" == *"/reports/public/"* ]]; then
    separator="?"
    if [[ "${url}" == *"?"* ]]; then
      separator="&"
    fi
    request_url="${url}${separator}api_key=${dashboard_api_key}"
  fi

  if curl "${curl_args[@]}" "${request_url}" >"${result_file}" 2>>"${log_file}"; then
    read -r http_status latency_seconds <"${result_file}"
  else
    http_status="000"
    latency_seconds="${timeout_seconds}"
  fi

  rm -f "${result_file}"

  if [ "${http_status}" -ge 200 ] && [ "${http_status}" -lt 400 ]; then
    up=1
  else
    up=0
    failures=$((failures + 1))
    send_alert "FIQ watcher: ${name} failed with HTTP ${http_status} at ${checked_at}"
  fi

  printf '%s target=%s url=%s status=%s latency=%s up=%s\n' \
    "${checked_at}" "${name}" "${url}" "${http_status}" "${latency_seconds}" "${up}" >>"${log_file}"

  write_metric "fiq_watcher_up{target=\"${name}\"} ${up}"
  write_metric "fiq_watcher_http_status{target=\"${name}\"} ${http_status}"
  write_metric "fiq_watcher_latency_seconds{target=\"${name}\"} ${latency_seconds}"
done

install -m 0644 "${tmp_metrics}" "${metrics_file}"

if [ "${failures}" -gt 0 ]; then
  exit 1
fi
