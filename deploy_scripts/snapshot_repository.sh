#!/usr/bin/env bash
set -euo pipefail

snapshot_paths="${SNAPSHOT_PATHS:-${BACKUP_ROOT:-/var/backups/fiq}}"
snapshot_tags="${SNAPSHOT_TAGS:-fiq,production}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [[ -z "${RESTIC_REPOSITORY:-}" || -z "${RESTIC_PASSWORD:-}" ]]; then
  echo "Skipping snapshot: RESTIC_REPOSITORY or RESTIC_PASSWORD is not set"
  exit 0
fi

require_cmd restic

export RESTIC_REPOSITORY
export RESTIC_PASSWORD

restic snapshots >/dev/null 2>&1 || restic init

tag_args=()
IFS=',' read -r -a tag_list <<<"${snapshot_tags}"
for tag in "${tag_list[@]}"; do
  tag_args+=(--tag "${tag}")
done

read -r -a path_list <<<"${snapshot_paths}"
restic backup "${tag_args[@]}" "${path_list[@]}"
restic forget "${tag_args[@]}" --keep-daily 14 --keep-weekly 8 --keep-monthly 6 --prune
