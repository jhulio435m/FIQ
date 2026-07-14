#!/usr/bin/env bash
set -euo pipefail

cluster_name="${K3D_CLUSTER_NAME:-fiq-lab}"
k3d_use_sudo="${K3D_USE_SUDO:-0}"

run_k3d() {
  if [ "${k3d_use_sudo}" = "1" ]; then
    sudo -E k3d "$@"
    return
  fi

  k3d "$@"
}

if ! command -v k3d >/dev/null 2>&1; then
  echo "k3d is not installed; nothing to destroy"
  exit 0
fi

run_k3d cluster delete "${cluster_name}"
