#!/usr/bin/env bash
set -euo pipefail

config_file="${1:-/etc/fiq-watcher/watcher.env}"

if [ -f "${config_file}" ]; then
  # shellcheck disable=SC1090
  source "${config_file}"
fi

targets="${FIQ_WATCHER_TARGETS:-}"
tcp_targets="${FIQ_WATCHER_TCP_TARGETS:-}"
timeout_seconds="${FIQ_WATCHER_TIMEOUT_SECONDS:-10}"
metrics_file="${FIQ_WATCHER_METRICS_FILE:-/tmp/fiq-watcher.prom}"
log_file="${FIQ_WATCHER_LOG_FILE:-/tmp/fiq-watcher.log}"
dashboard_api_key="${DASHBOARD_API_KEY:-}"
alert_webhook_url="${FIQ_WATCHER_ALERT_WEBHOOK_URL:-}"
state_dir="${FIQ_WATCHER_STATE_DIR:-/var/lib/fiq-watcher}"
telegram_bot_token="${TELEGRAM_BOT_TOKEN:-}"
telegram_chat_ids="${TELEGRAM_ALLOWED_CHAT_IDS:-${TELEGRAM_CHAT_ID:-}}"
telegram_chats_file="${TELEGRAM_CHATS_FILE:-${state_dir}/telegram_chats}"
alert_on_recovery="${FIQ_WATCHER_ALERT_ON_RECOVERY:-true}"

if [ -z "${targets}" ] && [ -z "${tcp_targets}" ]; then
  echo "FIQ_WATCHER_TARGETS or FIQ_WATCHER_TCP_TARGETS is required" >&2
  exit 2
fi

tmp_metrics="$(mktemp)"
failures=0
checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "${state_dir}" "$(dirname "${metrics_file}")" "$(dirname "${log_file}")"

cleanup() {
  rm -f "${tmp_metrics}"
}
trap cleanup EXIT

write_metric() {
  printf '%s\n' "$1" >>"${tmp_metrics}"
}

state_key() {
  printf '%s' "$1" | tr -c 'A-Za-z0-9_.-' '_'
}

send_alert() {
  local message="$1"

  if [ -n "${alert_webhook_url}" ]; then
    curl --fail --silent --show-error \
      --connect-timeout 5 \
      --max-time 10 \
      --request POST \
      --header "Content-Type: application/json" \
      --data "{\"text\":\"${message}\"}" \
      "${alert_webhook_url}" >/dev/null || true
  fi

  if [ -z "${telegram_bot_token}" ]; then
    return
  fi

  local recipients="${telegram_chat_ids}"
  if [ -f "${telegram_chats_file}" ]; then
    recipients="${recipients} $(tr '\n' ' ' <"${telegram_chats_file}")"
  fi

  for chat_id in ${recipients}; do
    curl --fail --silent --show-error \
      --connect-timeout 5 \
      --max-time 10 \
      --data-urlencode "chat_id=${chat_id}" \
      --data-urlencode "text=${message}" \
      "https://api.telegram.org/bot${telegram_bot_token}/sendMessage" >/dev/null || true
  done
}

remember_status() {
  local name="$1"
  local current_up="$2"
  local status="$3"
  local detail="$4"
  local state_file="${state_dir}/status_$(state_key "${name}")"
  local previous_up=""

  if [ -f "${state_file}" ]; then
    previous_up="$(cat "${state_file}")"
  fi

  if [ "${current_up}" = "0" ] && [ "${previous_up}" != "0" ]; then
    send_alert "FIQ alert: ${name} DOWN (${status}) at ${checked_at}. ${detail}"
  elif [ "${current_up}" = "1" ] && [ "${previous_up}" = "0" ] && [ "${alert_on_recovery}" = "true" ]; then
    send_alert "FIQ recovery: ${name} is UP at ${checked_at}. ${detail}"
  fi

  printf '%s\n' "${current_up}" >"${state_file}"
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
    --write-out "%{http_code} %{time_total}\n"
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
  fi

  remember_status "${name}" "${up}" "HTTP ${http_status}" "${url}"

  printf '%s target=%s url=%s status=%s latency=%s up=%s\n' \
    "${checked_at}" "${name}" "${url}" "${http_status}" "${latency_seconds}" "${up}" >>"${log_file}"

  write_metric "fiq_watcher_up{target=\"${name}\"} ${up}"
  write_metric "fiq_watcher_http_status{target=\"${name}\"} ${http_status}"
  write_metric "fiq_watcher_latency_seconds{target=\"${name}\"} ${latency_seconds}"
done

for target in ${tcp_targets}; do
  name="${target%%=*}"
  endpoint="${target#*=}"
  host="${endpoint%:*}"
  port="${endpoint##*:}"

  if [ "${name}" = "${target}" ] || [ -z "${name}" ] || [ -z "${host}" ] || [ -z "${port}" ] || [ "${host}" = "${port}" ]; then
    echo "Invalid TCP target entry: ${target}" >&2
    failures=$((failures + 1))
    continue
  fi

  start_time="$(date +%s)"
  if timeout "${timeout_seconds}" bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>>"${log_file}"; then
    tcp_status=1
    up=1
  else
    tcp_status=0
    up=0
    failures=$((failures + 1))
  fi
  end_time="$(date +%s)"
  latency_seconds="$((end_time - start_time))"

  remember_status "${name}" "${up}" "TCP ${host}:${port}" "${endpoint}"

  printf '%s target=%s tcp=%s status=%s latency=%s up=%s\n' \
    "${checked_at}" "${name}" "${endpoint}" "${tcp_status}" "${latency_seconds}" "${up}" >>"${log_file}"

  write_metric "fiq_watcher_up{target=\"${name}\"} ${up}"
  write_metric "fiq_watcher_tcp_status{target=\"${name}\"} ${tcp_status}"
  write_metric "fiq_watcher_latency_seconds{target=\"${name}\"} ${latency_seconds}"
done

install -m 0644 "${tmp_metrics}" "${metrics_file}"

if [ "${failures}" -gt 0 ]; then
  exit 1
fi
