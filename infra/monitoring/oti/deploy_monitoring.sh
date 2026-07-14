#!/usr/bin/env bash
set -euo pipefail

base_dir="${FIQ_MONITORING_DIR:-${HOME}/fiq-monitoring}"
grafana_port="${FIQ_GRAFANA_PORT:-13000}"
prometheus_port="${FIQ_PROMETHEUS_PORT:-19090}"
node_exporter_port="${FIQ_NODE_EXPORTER_PORT:-19100}"
network_name="${FIQ_MONITORING_NETWORK:-fiq-monitoring}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

container_exists() {
  podman container exists "$1" >/dev/null 2>&1
}

start_or_replace() {
  local name="$1"
  shift

  if container_exists "${name}"; then
    podman rm -f "${name}" >/dev/null
  fi

  podman run -d --name "${name}" "$@"
}

require_cmd podman
require_cmd openssl

mkdir -p "${base_dir}/prometheus" "${base_dir}/prometheus-data" "${base_dir}/grafana"
cp prometheus.yml "${base_dir}/prometheus/prometheus.yml"
podman unshare chown -R 65534:65534 "${base_dir}/prometheus-data"

if [ ! -f "${base_dir}/grafana-admin-password" ]; then
  openssl rand -hex 18 >"${base_dir}/grafana-admin-password"
  chmod 0600 "${base_dir}/grafana-admin-password"
fi

grafana_password="$(cat "${base_dir}/grafana-admin-password")"

podman network exists "${network_name}" >/dev/null 2>&1 || podman network create "${network_name}" >/dev/null

start_or_replace fiq-node-exporter \
  --network "${network_name}" \
  --restart unless-stopped \
  -p "127.0.0.1:${node_exporter_port}:9100" \
  -v "/:/host:ro,rslave" \
  quay.io/prometheus/node-exporter:v1.9.1 \
  --path.rootfs=/host

start_or_replace fiq-prometheus \
  --network "${network_name}" \
  --restart unless-stopped \
  -p "127.0.0.1:${prometheus_port}:9090" \
  -v "${base_dir}/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "${base_dir}/prometheus-data:/prometheus" \
  docker.io/prom/prometheus:v3.5.0 \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus

start_or_replace fiq-grafana \
  --network "${network_name}" \
  --restart unless-stopped \
  -p "127.0.0.1:${grafana_port}:3000" \
  -e "GF_SECURITY_ADMIN_USER=admin" \
  -e "GF_SECURITY_ADMIN_PASSWORD=${grafana_password}" \
  -e "GF_SERVER_ROOT_URL=http://127.0.0.1:${grafana_port}" \
  -v "${base_dir}/grafana:/var/lib/grafana" \
  docker.io/grafana/grafana:12.1.0

echo "Grafana: http://127.0.0.1:${grafana_port}"
echo "Prometheus: http://127.0.0.1:${prometheus_port}"
echo "Node exporter: http://127.0.0.1:${node_exporter_port}/metrics"
echo "Grafana admin password file: ${base_dir}/grafana-admin-password"
