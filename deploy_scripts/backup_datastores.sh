#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="${BACKUP_ROOT:-/var/backups/fiq}"
workdir="${backup_root}/${timestamp}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "${workdir}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

container_runtime() {
  if command -v podman >/dev/null 2>&1; then
    echo podman
    return
  fi
  if command -v docker >/dev/null 2>&1; then
    echo docker
    return
  fi
  echo ""
}

backup_volume_arg() {
  local runtime="$1"
  [[ -n "${runtime}" ]]
  echo "${workdir}:/backup"
}

if [[ -z "${POSTGRES_BACKUP_URL:-}" && -z "${MONGO_BACKUP_URI:-}" ]]; then
  echo "At least one datastore URI is required: POSTGRES_BACKUP_URL or MONGO_BACKUP_URI" >&2
  exit 2
fi

backup_postgres() {
  if [[ -z "${POSTGRES_BACKUP_URL:-}" ]]; then
    echo "Skipping PostgreSQL backup: POSTGRES_BACKUP_URL is not set"
    return
  fi
  local outfile="${workdir}/postgres_fiq_${timestamp}.dump"
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --format=custom --no-owner --no-acl --file="${outfile}" "${POSTGRES_BACKUP_URL}"
  else
    local runtime
    runtime="$(container_runtime)"
    if [[ -z "${runtime}" ]]; then
      echo "Missing pg_dump and no Docker-compatible runtime found" >&2
      exit 1
    fi
    chmod 0777 "${workdir}"
    "${runtime}" run --rm \
      --user "$(id -u):$(id -g)" \
      -v "${workdir}:/backup" \
      docker.io/library/postgres:17-alpine \
      pg_dump --format=custom --no-owner --no-acl --file="/backup/$(basename "${outfile}")" "${POSTGRES_BACKUP_URL}"
  fi
  sha256sum "${outfile}" > "${outfile}.sha256"
}

backup_mongo() {
  if [[ -z "${MONGO_BACKUP_URI:-}" ]]; then
    echo "Skipping MongoDB backup: MONGO_BACKUP_URI is not set"
    return
  fi
  local outdir="${workdir}/mongo_fiq_${timestamp}"
  local mongo_args=(--uri="${MONGO_BACKUP_URI}" --out="${outdir}")
  if [[ -n "${MONGO_BACKUP_DB:-}" ]]; then
    mongo_args+=(--db="${MONGO_BACKUP_DB}")
  fi
  if command -v mongodump >/dev/null 2>&1; then
    mongodump "${mongo_args[@]}"
  else
    local runtime
    runtime="$(container_runtime)"
    if [[ -z "${runtime}" ]]; then
      echo "Missing mongodump and no Docker-compatible runtime found" >&2
      exit 1
    fi
    local volume_arg
    volume_arg="$(backup_volume_arg "${runtime}")"
    chmod 0777 "${workdir}"
    "${runtime}" run --rm \
      --user "$(id -u):$(id -g)" \
      -v "${volume_arg}" \
      docker.io/library/mongo:8 \
      mongodump "${mongo_args[@]/${workdir}/\/backup}"
  fi
  if [[ ! -d "${outdir}" ]]; then
    mkdir -p "${outdir}"
  fi
  tar -C "${workdir}" -czf "${outdir}.tar.gz" "$(basename "${outdir}")"
  sha256sum "${outdir}.tar.gz" > "${outdir}.tar.gz.sha256"
  rm -rf "${outdir}" 2>/dev/null || {
    echo "Warning: raw MongoDB dump directory kept because cleanup failed: ${outdir}" >&2
  }
}

write_manifest() {
  cat > "${workdir}/manifest.txt" <<EOF
timestamp=${timestamp}
hostname=$(hostname)
postgres_enabled=$([[ -n "${POSTGRES_BACKUP_URL:-}" ]] && echo true || echo false)
mongo_enabled=$([[ -n "${MONGO_BACKUP_URI:-}" ]] && echo true || echo false)
retention_days=${retention_days}
EOF
}

cleanup_old_backups() {
  find "${backup_root}" -mindepth 1 -maxdepth 1 -type d -mtime +"${retention_days}" -print -exec rm -rf {} \;
}

backup_postgres
backup_mongo
write_manifest
cleanup_old_backups
chmod 0750 "${workdir}"

echo "Backup completed: ${workdir}"
