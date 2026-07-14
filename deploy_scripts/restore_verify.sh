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
