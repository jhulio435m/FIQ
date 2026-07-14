#!/usr/bin/env bash
set -euo pipefail

NODE1_HOST="${NODE1_HOST:-oti@100.79.244.99}"
NODE1_IP="${NODE1_IP:-100.79.244.99}"
NODE2_HOST="${NODE2_HOST:-ubuntu@147.224.242.204}"
NODE2_IP="${NODE2_IP:-100.97.171.89}"
NODE2_SSH_KEY="${NODE2_SSH_KEY:-/home/blink/downloads/ssh-key-2026-07-01.key}"
NODE3_IP="${NODE3_IP:-100.126.122.28}"
POSTGRES_SUPERUSER_PASSWORD="${POSTGRES_SUPERUSER_PASSWORD:?POSTGRES_SUPERUSER_PASSWORD is required}"
PGDATABASE="${PGDATABASE:-postgres}"
PGUSER="${PGUSER:-postgres}"

ssh_node1() {
  ssh -F /dev/null "${NODE1_HOST}" "$@"
}

ssh_node2() {
  ssh -F /dev/null -i "${NODE2_SSH_KEY}" "${NODE2_HOST}" "$@"
}

patroni_role() {
  local ip="$1"
  curl -fsS "http://${ip}:8008/patroni" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("role","unknown"))'
}

leader_ip() {
  for ip in "${NODE1_IP}" "${NODE2_IP}" "${NODE3_IP}"; do
    if [[ "$(patroni_role "${ip}" 2>/dev/null || true)" == "master" ]]; then
      echo "${ip}"
      return 0
    fi
  done
  return 1
}

query_via_haproxy() {
  PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD}" psql \
    "postgresql://${PGUSER}@${NODE1_IP}:5000/${PGDATABASE}" \
    -Atc "select inet_server_addr(), pg_is_in_recovery();"
}

stop_patroni_on_ip() {
  local ip="$1"
  if [[ "${ip}" == "${NODE1_IP}" ]]; then
    ssh_node1 "cd ~/FIQ/ha-database && docker compose -f compose.yaml stop patroni || podman-compose -f compose.yaml stop patroni"
  elif [[ "${ip}" == "${NODE2_IP}" ]]; then
    ssh_node2 "cd ~/FIQ/ha-database && docker compose -f compose.yaml stop patroni || podman-compose -f compose.yaml stop patroni"
  elif [[ "${ip}" == "${NODE3_IP}" ]]; then
    (cd ha-database && docker compose -f compose.yaml stop patroni || podman-compose -f compose.yaml stop patroni)
  else
    echo "Unknown leader ip: ${ip}" >&2
    return 1
  fi
}

main() {
  local old_leader new_leader
  old_leader="$(leader_ip)"
  echo "Current leader: ${old_leader}"
  echo "HAProxy write query before failover:"
  query_via_haproxy

  stop_patroni_on_ip "${old_leader}"
  echo "Stopped Patroni on old leader: ${old_leader}"

  for _ in $(seq 1 30); do
    new_leader="$(leader_ip || true)"
    if [[ -n "${new_leader:-}" && "${new_leader}" != "${old_leader}" ]]; then
      echo "New leader: ${new_leader}"
      echo "HAProxy write query after failover:"
      query_via_haproxy
      return 0
    fi
    sleep 2
  done

  echo "Failover did not complete within timeout" >&2
  return 1
}

main "$@"
