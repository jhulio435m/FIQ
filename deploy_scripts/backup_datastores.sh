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

backup_postgres() {
  if [[ -z "${POSTGRES_BACKUP_URL:-}" ]]; then
    echo "Skipping PostgreSQL backup: POSTGRES_BACKUP_URL is not set"
    return
  fi
  require_cmd pg_dump
  local outfile="${workdir}/postgres_fiq_${timestamp}.dump"
  pg_dump --format=custom --no-owner --no-acl --file="${outfile}" "${POSTGRES_BACKUP_URL}"
  sha256sum "${outfile}" > "${outfile}.sha256"
}

backup_mongo() {
  if [[ -z "${MONGO_BACKUP_URI:-}" ]]; then
    echo "Skipping MongoDB backup: MONGO_BACKUP_URI is not set"
    return
  fi
  require_cmd mongodump
  local outdir="${workdir}/mongo_fiq_${timestamp}"
  mongodump --uri="${MONGO_BACKUP_URI}" --out="${outdir}"
  tar -C "${workdir}" -czf "${outdir}.tar.gz" "$(basename "${outdir}")"
  rm -rf "${outdir}"
  sha256sum "${outdir}.tar.gz" > "${outdir}.tar.gz.sha256"
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

echo "Backup completed: ${workdir}"
