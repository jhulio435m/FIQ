#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env.prod}"
namespace="${2:-fiq-prod}"

if [ ! -f "${env_file}" ]; then
  echo "env file not found: ${env_file}" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "${env_file}"
set +a

required=(
  DATABASE_URL
  DATABASE_READ_URL
  RESOURCE_SHARD_DATABASE_URLS
  RESOURCE_SHARD_READ_DATABASE_URLS
  SECRET_KEY
  S3_ACCESS_KEY
  S3_SECRET_KEY
  POSTGRES_SUPERUSER_PASSWORD
  POSTGRES_REPLICATION_PASSWORD
  POSTGRES_REWIND_PASSWORD
  RESOURCE_SHARD_PASSWORD
)

for key in "${required[@]}"; do
  if [ -z "${!key:-}" ]; then
    echo "missing required env: ${key}" >&2
    exit 2
  fi
done

kubectl create namespace "${namespace}" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "${namespace}" create secret generic fiq-secrets \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=DATABASE_READ_URL="${DATABASE_READ_URL}" \
  --from-literal=RESOURCE_SHARD_DATABASE_URLS="${RESOURCE_SHARD_DATABASE_URLS}" \
  --from-literal=RESOURCE_SHARD_READ_DATABASE_URLS="${RESOURCE_SHARD_READ_DATABASE_URLS}" \
  --from-literal=POSTGRES_SUPERUSER_PASSWORD="${POSTGRES_SUPERUSER_PASSWORD}" \
  --from-literal=POSTGRES_REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD}" \
  --from-literal=POSTGRES_REWIND_PASSWORD="${POSTGRES_REWIND_PASSWORD}" \
  --from-literal=RESOURCE_SHARD_USER="${RESOURCE_SHARD_USER:-fiq_shard}" \
  --from-literal=RESOURCE_SHARD_PASSWORD="${RESOURCE_SHARD_PASSWORD}" \
  --from-literal=RESOURCE_SHARD_DB="${RESOURCE_SHARD_DB:-fiq_resource_shard}" \
  --from-literal=MONGO_URL="${MONGO_URL:-}" \
  --from-literal=SECRET_KEY="${SECRET_KEY}" \
  --from-literal=DASHBOARD_API_KEY="${DASHBOARD_API_KEY:-}" \
  --from-literal=S3_ACCESS_KEY="${S3_ACCESS_KEY}" \
  --from-literal=S3_SECRET_KEY="${S3_SECRET_KEY}" \
  --from-literal=MINIO_ROOT_USER="${S3_ACCESS_KEY}" \
  --from-literal=MINIO_ROOT_PASSWORD="${S3_SECRET_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -
