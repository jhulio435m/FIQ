#!/usr/bin/env bash
# Verifica que un backup se puede restaurar, no solo que existe.
#
#   restore_verify.sh [directorio-de-backup]
#
# Sin argumento usa el backup más reciente bajo BACKUP_ROOT. Pasos:
#   1. Verifica los checksums sha256.
#   2. Valida que el dump de PostgreSQL es legible (pg_restore --list).
#   3. Si RESTORE_TEST_URL apunta a una base de datos DESECHABLE, restaura el
#      dump allí y comprueba que las tablas críticas tienen filas.
#
# RESTORE_TEST_URL nunca debe ser la base de producción: el restore usa --clean.
set -euo pipefail

backup_root="${BACKUP_ROOT:-/var/backups/fiq}"
backup_dir="${1:-}"
if [[ -z "${backup_dir}" ]]; then
  backup_dir="$(find "${backup_root}" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
fi
if [[ -z "${backup_dir}" || ! -d "${backup_dir}" ]]; then
  echo "No se encontró ningún backup en ${backup_root}" >&2
  exit 1
fi
echo "Verificando backup: ${backup_dir}"

shopt -s nullglob
checksums=("${backup_dir}"/*.sha256)
if (( ${#checksums[@]} == 0 )); then
  echo "El backup no tiene archivos .sha256" >&2
  exit 1
fi
for checksum in "${checksums[@]}"; do
  (cd "${backup_dir}" && sha256sum -c "$(basename "${checksum}")" >/dev/null)
done
echo "Checksums OK (${#checksums[@]} archivos)"

dumps=("${backup_dir}"/postgres_*.dump)
if (( ${#dumps[@]} == 0 )); then
  echo "Sin dump de PostgreSQL en este backup; nada más que verificar."
  exit 0
fi
dump="${dumps[0]}"
objects="$(pg_restore --list "${dump}" | grep -c ' TABLE DATA ' || true)"
if (( objects == 0 )); then
  echo "El dump ${dump} no contiene datos de tablas" >&2
  exit 1
fi
echo "Dump legible: ${objects} tablas con datos"

if [[ -z "${RESTORE_TEST_URL:-}" ]]; then
  echo "RESTORE_TEST_URL no definido: se omite el restore completo."
  exit 0
fi

echo "Restaurando en la base de pruebas..."
pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --dbname="${RESTORE_TEST_URL}" "${dump}"

for table in roles '"user"' recursos tipos_recurso; do
  count="$(psql "${RESTORE_TEST_URL}" -tAc "SELECT count(*) FROM ${table}")"
  echo "  ${table}: ${count} filas"
  if [[ "${table}" != "recursos" && "${count}" -eq 0 ]]; then
    echo "La tabla ${table} quedó vacía tras el restore" >&2
    exit 1
  fi
done
echo "Restore verificado correctamente."
