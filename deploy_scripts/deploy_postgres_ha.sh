#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HA_DIR="${ROOT_DIR}/ha-database"

NODE1_NAME="${NODE1_NAME:-oti}"
NODE1_HOST="${NODE1_HOST:-oti@100.79.244.99}"
NODE1_IP="${NODE1_IP:-10.77.0.2}"

NODE2_NAME="${NODE2_NAME:-ubuntu}"
NODE2_HOST="${NODE2_HOST:-ubuntu@147.224.242.204}"
NODE2_IP="${NODE2_IP:-10.77.0.1}"
NODE2_SSH_KEY="${NODE2_SSH_KEY:-/home/blink/downloads/ssh-key-2026-07-01.key}"

NODE3_NAME="${NODE3_NAME:-laptop}"
NODE3_IP="${NODE3_IP:-10.77.0.3}"

REMOTE_DIR="${REMOTE_DIR:-~/FIQ/ha-database}"
LOCAL_DIR="${LOCAL_DIR:-${HA_DIR}}"
COMPOSE_UP_ARGS="${COMPOSE_UP_ARGS:--d --build}"
REMOTE_COMPOSE_UP_ARGS="${REMOTE_COMPOSE_UP_ARGS:-${COMPOSE_UP_ARGS}}"
LOCAL_COMPOSE_UP_ARGS="${LOCAL_COMPOSE_UP_ARGS:-${COMPOSE_UP_ARGS}}"
ETCD_INITIAL_CLUSTER_TOKEN="${ETCD_INITIAL_CLUSTER_TOKEN:-fiq-etcd-cluster}"
ETCD_INITIAL_CLUSTER="etcd-1=http://${NODE1_IP}:2380,etcd-2=http://${NODE2_IP}:2380,etcd-3=http://${NODE3_IP}:2380"
PATRONI_ETCD_HOSTS="${NODE1_IP}:2379,${NODE2_IP}:2379,${NODE3_IP}:2379"

POSTGRES_SUPERUSER_PASSWORD="${POSTGRES_SUPERUSER_PASSWORD:-$(openssl rand -base64 32)}"
POSTGRES_REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD:-$(openssl rand -base64 32)}"
POSTGRES_REWIND_PASSWORD="${POSTGRES_REWIND_PASSWORD:-$(openssl rand -base64 32)}"

ssh_node1() {
  ssh -F /dev/null "${NODE1_HOST}" "$@"
}

ssh_node2() {
  ssh -F /dev/null -i "${NODE2_SSH_KEY}" "${NODE2_HOST}" "$@"
}

scp_node1() {
  scp -F /dev/null "$@" "${NODE1_HOST}:${REMOTE_DIR}/"
}

scp_node2() {
  scp -F /dev/null -i "${NODE2_SSH_KEY}" "$@" "${NODE2_HOST}:${REMOTE_DIR}/"
}

runtime_compose_cmd() {
  if command -v docker >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if command -v podman-compose >/dev/null 2>&1; then
    echo "podman-compose"
    return
  fi
  echo ""
}

remote_compose_cmd() {
  local host="$1"
  local key_arg=()
  if [[ "$host" == "${NODE2_HOST}" ]]; then
    key_arg=(-i "${NODE2_SSH_KEY}")
  fi
  ssh -F /dev/null "${key_arg[@]}" "${host}" 'if command -v docker >/dev/null 2>&1; then echo "docker compose"; elif command -v podman-compose >/dev/null 2>&1; then echo "podman-compose"; else echo ""; fi'
}

write_env() {
  local path="$1"
  local node_id="$2"
  local node_name="$3"
  local node_ip="$4"
  cat >"${path}" <<EOF
NODE_ID=${node_id}
NODE_IP=${node_ip}
ETCD_NAME=etcd-${node_id}
PATRONI_NAME=${node_name}
NODE1_IP=${NODE1_IP}
NODE2_IP=${NODE2_IP}
NODE3_IP=${NODE3_IP}
ETCD_INITIAL_CLUSTER_TOKEN=${ETCD_INITIAL_CLUSTER_TOKEN}
ETCD_INITIAL_CLUSTER=${ETCD_INITIAL_CLUSTER}
ETCD_INITIAL_CLUSTER_STATE=new
PATRONI_ETCD_HOSTS=${PATRONI_ETCD_HOSTS}
POSTGRES_SUPERUSER_PASSWORD=${POSTGRES_SUPERUSER_PASSWORD}
POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD}
POSTGRES_REWIND_PASSWORD=${POSTGRES_REWIND_PASSWORD}
EOF
  chmod 0600 "${path}"
}

copy_payload_local() {
  install -d -m 0750 "${LOCAL_DIR}"
  if [[ "$(realpath -m "${LOCAL_DIR}")" == "$(realpath -m "${HA_DIR}")" ]]; then
    return
  fi
  install -m 0644 "${HA_DIR}/compose.yaml" "${LOCAL_DIR}/compose.yaml"
  install -m 0644 "${HA_DIR}/Dockerfile.patroni" "${LOCAL_DIR}/Dockerfile.patroni"
  install -m 0644 "${HA_DIR}/patroni.yml" "${LOCAL_DIR}/patroni.yml"
  install -m 0644 "${HA_DIR}/haproxy.cfg.tpl" "${LOCAL_DIR}/haproxy.cfg.tpl"
  install -m 0755 "${HA_DIR}/render-haproxy.sh" "${LOCAL_DIR}/render-haproxy.sh"
}

copy_payload_remote() {
  local node="$1"
  if [[ "${node}" == "1" ]]; then
    ssh_node1 "mkdir -p ${REMOTE_DIR}"
    scp_node1 "${HA_DIR}/compose.yaml" "${HA_DIR}/Dockerfile.patroni" "${HA_DIR}/patroni.yml" "${HA_DIR}/haproxy.cfg.tpl" "${HA_DIR}/render-haproxy.sh"
  elif [[ "${node}" == "2" ]]; then
    ssh_node2 "mkdir -p ${REMOTE_DIR}"
    scp_node2 "${HA_DIR}/compose.yaml" "${HA_DIR}/Dockerfile.patroni" "${HA_DIR}/patroni.yml" "${HA_DIR}/haproxy.cfg.tpl" "${HA_DIR}/render-haproxy.sh"
  fi
}

put_env_remote() {
  local node="$1"
  local env_file="$2"
  if [[ "${node}" == "1" ]]; then
    scp -F /dev/null "${env_file}" "${NODE1_HOST}:${REMOTE_DIR}/.env"
  elif [[ "${node}" == "2" ]]; then
    scp -F /dev/null -i "${NODE2_SSH_KEY}" "${env_file}" "${NODE2_HOST}:${REMOTE_DIR}/.env"
  fi
}

start_local() {
  local compose_cmd
  compose_cmd="$(runtime_compose_cmd)"
  if [[ -z "${compose_cmd}" ]]; then
    echo "Missing local docker compose or podman-compose" >&2
    exit 1
  fi
  (cd "${LOCAL_DIR}" && ${compose_cmd} -f compose.yaml up ${LOCAL_COMPOSE_UP_ARGS})
}

start_remote() {
  local host="$1"
  local compose_cmd
  compose_cmd="$(remote_compose_cmd "${host}")"
  if [[ -z "${compose_cmd}" ]]; then
    echo "Missing docker compose or podman-compose on ${host}" >&2
    exit 1
  fi
  if [[ "${host}" == "${NODE2_HOST}" ]]; then
    ssh -F /dev/null -i "${NODE2_SSH_KEY}" "${host}" "cd ${REMOTE_DIR} && ${compose_cmd} -f compose.yaml up ${REMOTE_COMPOSE_UP_ARGS}"
  else
    ssh -F /dev/null "${host}" "cd ${REMOTE_DIR} && ${compose_cmd} -f compose.yaml up ${REMOTE_COMPOSE_UP_ARGS}"
  fi
}

main() {
  DEPLOY_TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "${DEPLOY_TMP_DIR:-}"' EXIT

  copy_payload_remote 1
  copy_payload_remote 2
  copy_payload_local

  write_env "${DEPLOY_TMP_DIR}/node1.env" 1 "${NODE1_NAME}" "${NODE1_IP}"
  write_env "${DEPLOY_TMP_DIR}/node2.env" 2 "${NODE2_NAME}" "${NODE2_IP}"
  write_env "${DEPLOY_TMP_DIR}/node3.env" 3 "${NODE3_NAME}" "${NODE3_IP}"

  put_env_remote 1 "${DEPLOY_TMP_DIR}/node1.env"
  put_env_remote 2 "${DEPLOY_TMP_DIR}/node2.env"
  install -m 0600 "${DEPLOY_TMP_DIR}/node3.env" "${LOCAL_DIR}/.env"

  start_remote "${NODE1_HOST}"
  start_remote "${NODE2_HOST}"
  start_local

  cat <<EOF
PostgreSQL HA deployment requested.

Write endpoint: ${NODE1_IP}:5000, ${NODE2_IP}:5000, ${NODE3_IP}:5000
Read endpoint:  ${NODE1_IP}:5001, ${NODE2_IP}:5001, ${NODE3_IP}:5001
HAProxy stats:  http://${NODE1_IP}:7000/

Use DATABASE_URL=postgresql://postgres:<password>@${NODE1_IP}:5000/fiq_prod
EOF
}

main "$@"
