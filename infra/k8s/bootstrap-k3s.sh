#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bootstrap-k3s.sh init <node-name> <node-ip>
  bootstrap-k3s.sh join <node-name> <node-ip> <server-url> <token>

Examples:
  bootstrap-k3s.sh init abc 100.97.171.89
  bootstrap-k3s.sh join server 100.87.33.2 https://100.97.171.89:6443 K10...
USAGE
}

if [ "$#" -lt 3 ]; then
  usage >&2
  exit 2
fi

mode="$1"
node_name="$2"
node_ip="$3"
shift 3

common_args=(
  --node-name "${node_name}"
  --node-ip "${node_ip}"
  --node-external-ip "${node_ip}"
  --advertise-address "${node_ip}"
  --flannel-iface tailscale0
  --disable traefik
  --disable servicelb
  --write-kubeconfig-mode 0644
  --tls-san 100.79.244.99
  --tls-san 100.97.171.89
  --tls-san 100.87.33.2
  --tls-san 100.110.204.72
  --tls-san 100.94.200.89
)

case "${mode}" in
  init)
    curl -sfL https://get.k3s.io | sh -s - server --cluster-init "${common_args[@]}"
    ;;
  join)
    if [ "$#" -ne 2 ]; then
      usage >&2
      exit 2
    fi
    server_url="$1"
    token="$2"
    curl -sfL https://get.k3s.io | K3S_TOKEN="${token}" sh -s - server --server "${server_url}" "${common_args[@]}"
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
