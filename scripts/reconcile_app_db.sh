#!/usr/bin/env bash
set -eu

APP_DIR="${1:-$HOME/FIQ/app}"
ENV_FILE="$APP_DIR/.env.prod"
PATRONI_CONTAINER="${PATRONI_CONTAINER:-ha-database-patroni-1}"

APP_USER="$(sed -n 's/^POSTGRES_USER=//p' "$ENV_FILE" | tail -1)"
APP_PASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ENV_FILE" | tail -1)"
APP_DB="$(sed -n 's/^POSTGRES_DB=//p' "$ENV_FILE" | tail -1)"

docker exec -i \
  -e APP_USER="$APP_USER" \
  -e APP_PASSWORD="$APP_PASSWORD" \
  -e APP_DB="$APP_DB" \
  "$PATRONI_CONTAINER" sh -s <<'CONTAINER_SCRIPT'
set -eu
python3 - <<'PY'
import os
from pathlib import Path


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


user = os.environ["APP_USER"]
password = os.environ["APP_PASSWORD"]
database = os.environ["APP_DB"]

Path("/tmp/reconcile_app_db.sql").write_text(
    f"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = {literal(user)}) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', {literal(user)}, {literal(password)});
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', {literal(user)}, {literal(password)});
  END IF;
END$$;
SELECT format('CREATE DATABASE %I OWNER %I', {literal(database)}, {literal(user)})
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = {literal(database)})\\gexec
SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', {literal(database)}, {literal(user)})\\gexec
"""
)
PY
PGPASSWORD="$PATRONI_SUPERUSER_PASSWORD" psql \
  -h 127.0.0.1 \
  -p 5000 \
  -U postgres \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -v app_user="$APP_USER" \
  -v app_password="$APP_PASSWORD" \
  -v app_db="$APP_DB" \
  -f /tmp/reconcile_app_db.sql
rm -f /tmp/reconcile_app_db.sql
CONTAINER_SCRIPT
