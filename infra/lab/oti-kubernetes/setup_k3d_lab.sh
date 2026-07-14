#!/usr/bin/env bash
set -euo pipefail

cluster_name="${K3D_CLUSTER_NAME:-fiq-lab}"
servers="${K3D_SERVERS:-1}"
agents="${K3D_AGENTS:-2}"
k3d_version="${K3D_VERSION:-v5.8.3}"
kubectl_version="${KUBECTL_VERSION:-v1.33.3}"
k3d_use_sudo="${K3D_USE_SUDO:-0}"
kubeconfig_path="${KUBECONFIG:-/tmp/${cluster_name}-kubeconfig}"
http_port="${K3D_HTTP_PORT:-18080}"
https_port="${K3D_HTTPS_PORT:-18443}"
curl_args=(--fail --show-error --location --connect-timeout 10 --max-time 180)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

configure_container_runtime() {
  local podman_socket="/run/user/$(id -u)/podman/podman.sock"

  if [ "${k3d_use_sudo}" = "1" ]; then
    sudo systemctl start podman.socket
    return
  fi

  if [ -z "${DOCKER_HOST:-}" ] && [ -S "${podman_socket}" ]; then
    export DOCKER_HOST="unix://${podman_socket}"
  fi
}

run_k3d() {
  if [ "${k3d_use_sudo}" = "1" ]; then
    sudo -E k3d "$@"
    return
  fi

  k3d "$@"
}

install_kubectl() {
  if command -v kubectl >/dev/null 2>&1; then
    return
  fi
  curl "${curl_args[@]}" -o /tmp/kubectl "https://dl.k8s.io/release/${kubectl_version}/bin/linux/amd64/kubectl"
  sudo install -m 0755 /tmp/kubectl /usr/local/bin/kubectl
  rm -f /tmp/kubectl
}

install_k3d() {
  if command -v k3d >/dev/null 2>&1; then
    return
  fi
  curl "${curl_args[@]}" -o /tmp/k3d-install.sh "https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh"
  TAG="${k3d_version}" bash /tmp/k3d-install.sh
  rm -f /tmp/k3d-install.sh
}

create_cluster() {
  if run_k3d cluster list "${cluster_name}" >/dev/null 2>&1; then
    echo "k3d cluster already exists: ${cluster_name}"
    return
  fi
  run_k3d cluster create "${cluster_name}" \
    --servers "${servers}" \
    --agents "${agents}" \
    --api-port 127.0.0.1:6445 \
    --port "${http_port}:80@loadbalancer" \
    --port "${https_port}:443@loadbalancer" \
    --k3s-arg "--disable=traefik@server:*"
}

write_kubeconfig() {
  run_k3d kubeconfig get "${cluster_name}" >"${kubeconfig_path}"
  chmod 0600 "${kubeconfig_path}"
  export KUBECONFIG="${kubeconfig_path}"
}

require_cmd curl
require_cmd sudo
if ! command -v docker >/dev/null 2>&1 && ! command -v podman >/dev/null 2>&1; then
  echo "Docker-compatible runtime is required" >&2
  exit 1
fi

configure_container_runtime
install_kubectl
install_k3d
create_cluster
write_kubeconfig

kubectl cluster-info
kubectl get nodes -o wide
