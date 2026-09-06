#!/usr/bin/env bash
set -euo pipefail

backup_path="${1:-}"
if [[ -z "${backup_path}" ]]; then
  echo "Usage: $0 <backup-file-or-directory>" >&2
  exit 2
fi

if [[ ! -e "${backup_path}" ]]; then
  echo "Backup path does not exist: ${backup_path}" >&2
  exit 1
fi

find "$(dirname "${backup_path}")" -maxdepth 1 -name '*.sha256' -print0 | while IFS= read -r -d '' checksum; do
  sha256sum -c "${checksum}"
done

echo "Checksum verification completed for: ${backup_path}"

if [[ "${RESTORE_VERIFY_EXECUTE:-false}" != "true" ]]; then
  echo "Logical restore skipped. Set RESTORE_VERIFY_EXECUTE=true and disposable targets to execute it."
  exit 0
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

postgres_dump="$(find "${backup_path}" -maxdepth 1 -type f -name 'postgres_*.dump' -print -quit)"
if [[ -n "${postgres_dump}" ]]; then
  : "${RESTORE_POSTGRES_URL:?RESTORE_POSTGRES_URL must identify a disposable database}"
  pg_restore --clean --if-exists --no-owner --no-acl --dbname="${RESTORE_POSTGRES_URL}" "${postgres_dump}"
  psql "${RESTORE_POSTGRES_URL}" -Atc 'select count(*) from recursos;' >/dev/null
  echo "PostgreSQL restore verified"
fi

mongo_archive="$(find "${backup_path}" -maxdepth 1 -type f -name 'mongo_*.tar.gz' -print -quit)"
if [[ -n "${mongo_archive}" ]]; then
  : "${RESTORE_MONGO_URI:?RESTORE_MONGO_URI must identify a disposable database}"
  tar -xzf "${mongo_archive}" -C "${tmpdir}"
  mongo_dump_dir="$(find "${tmpdir}" -mindepth 1 -maxdepth 1 -type d -name 'mongo_*' -print -quit)"
  mongorestore --drop --uri="${RESTORE_MONGO_URI}" "${mongo_dump_dir}"
  echo "MongoDB restore verified"
fi

minio_archive="$(find "${backup_path}" -maxdepth 1 -type f -name 'minio_*.tar.gz' -print -quit)"
if [[ -n "${minio_archive}" ]]; then
  : "${RESTORE_S3_ENDPOINT:?RESTORE_S3_ENDPOINT must identify disposable object storage}"
  : "${RESTORE_S3_ACCESS_KEY:?RESTORE_S3_ACCESS_KEY is required}"
  : "${RESTORE_S3_SECRET_KEY:?RESTORE_S3_SECRET_KEY is required}"
  : "${RESTORE_S3_BUCKET:?RESTORE_S3_BUCKET must identify a disposable bucket}"
  tar -xzf "${minio_archive}" -C "${tmpdir}"
  minio_dump_dir="$(find "${tmpdir}" -mindepth 1 -maxdepth 1 -type d -name 'minio_*' -print -quit)"
  MC_CONFIG_DIR="${tmpdir}/.mc" mc alias set restore-target "${RESTORE_S3_ENDPOINT}" "${RESTORE_S3_ACCESS_KEY}" "${RESTORE_S3_SECRET_KEY}" >/dev/null
  MC_CONFIG_DIR="${tmpdir}/.mc" mc mb --ignore-existing "restore-target/${RESTORE_S3_BUCKET}"
  MC_CONFIG_DIR="${tmpdir}/.mc" mc mirror --overwrite "${minio_dump_dir}" "restore-target/${RESTORE_S3_BUCKET}"
  source_count="$(find "${minio_dump_dir}" -type f | wc -l)"
  target_count="$(MC_CONFIG_DIR="${tmpdir}/.mc" mc find "restore-target/${RESTORE_S3_BUCKET}" --type f | wc -l)"
  [[ "${source_count}" == "${target_count}" ]] || {
    echo "Object restore count mismatch: source=${source_count} target=${target_count}" >&2
    exit 1
  }
  echo "MinIO restore verified (${target_count} objects)"
fi

echo "Logical restore verification completed for: ${backup_path}"
