#!/usr/bin/env bash
# Despliegue de un solo VPS con docker-compose.prod.yml (fallback de Kubernetes).
# Se ejecuta en el VPS, dentro del repo. Idempotente: no borra volúmenes ni datos.
#
#   FIQ_DOMAIN=fiq.uncp.edu.pe TUNNEL_TOKEN=... DATABASE_URL=... ./deploy_main.sh
#
# Almacenamiento: sin S3_ENDPOINT se levanta RustFS local (perfil "storage") con
# credenciales aleatorias. Con S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY se usa ese S3.
#
# Primera vez: genera .env.prod (0600) con secretos aleatorios; las siguientes
# ejecuciones lo reutilizan. Los secretos nunca se imprimen en consola.
set -euo pipefail

cd "$(dirname "$0")"
ENV_FILE=".env.prod"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}")

require() {
  if [[ -z "${!1:-}" ]]; then
    echo "Falta la variable $1. $2" >&2
    exit 1
  fi
}

if [[ ! -f "${ENV_FILE}" ]]; then
  require FIQ_DOMAIN "Dominio público, p. ej. fiq.uncp.edu.pe"
  require TUNNEL_TOKEN "Token del túnel con nombre (Cloudflare Zero Trust → Tunnels)"
  require DATABASE_URL "p. ej. postgresql://fiq_app:<clave>@host.docker.internal:5000/fiq_prod (HAProxy de ha-database)"
  require BOOTSTRAP_ADMIN_EMAIL "Email del primer administrador"

  if [[ -z "${S3_ENDPOINT:-}" ]]; then
    LOCAL_STORAGE=true
    S3_ENDPOINT="http://rustfs:9000"
    S3_ACCESS_KEY="fiq-$(openssl rand -hex 6)"
    S3_SECRET_KEY="$(openssl rand -hex 24)"
  else
    LOCAL_STORAGE=false
    require S3_ACCESS_KEY "Credencial del S3 externo"
    require S3_SECRET_KEY "Credencial del S3 externo"
  fi

  umask 077
  admin_password="$(openssl rand -base64 18)"
  cat > "${ENV_FILE}" <<EOF
DATABASE_URL=${DATABASE_URL}
SECRET_KEY=$(openssl rand -hex 32)
S3_ENDPOINT=${S3_ENDPOINT}
S3_PUBLIC_URL=${S3_PUBLIC_URL:-}
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
S3_BUCKET_NAME=${S3_BUCKET_NAME:-fiq-recursos}
CORS_ORIGINS=["https://${FIQ_DOMAIN}"]
TUNNEL_TOKEN=${TUNNEL_TOKEN}
FIQ_LOCAL_STORAGE=${LOCAL_STORAGE}
BOOTSTRAP_ADMIN_EMAIL=${BOOTSTRAP_ADMIN_EMAIL}
BOOTSTRAP_ADMIN_PASSWORD=${admin_password}
EOF
  chmod 600 "${ENV_FILE}"
  echo "Se creó ${ENV_FILE} (permisos 600)."
  echo "La contraseña inicial del admin está en BOOTSTRAP_ADMIN_PASSWORD dentro de ${ENV_FILE}: cámbiala tras el primer login."
fi

if grep -q '^FIQ_LOCAL_STORAGE=true' "${ENV_FILE}"; then
  COMPOSE+=(--profile storage)
  echo "Almacenamiento: RustFS local (volumen rustfs_data)."
fi

echo "Construyendo imágenes..."
"${COMPOSE[@]}" build --pull

echo "Aplicando migraciones (alembic + bootstrap idempotente)..."
"${COMPOSE[@]}" run --rm migrate

# backend depende de migrate (service_completed_successfully): si fallara, no arranca.
echo "Levantando servicios..."
"${COMPOSE[@]}" up -d --remove-orphans

echo "Esperando a que el backend esté listo..."
for _ in $(seq 1 40); do
  backend_id="$("${COMPOSE[@]}" ps -q backend)"
  status="$(docker inspect -f '{{.State.Health.Status}}' "${backend_id}" 2>/dev/null || echo starting)"
  [[ "${status}" == "healthy" ]] && break
  if [[ "${status}" == "unhealthy" ]]; then
    "${COMPOSE[@]}" logs --tail 80 backend >&2
    exit 1
  fi
  sleep 3
done
if [[ "${status}" != "healthy" ]]; then
  echo "El backend no quedó healthy a tiempo." >&2
  "${COMPOSE[@]}" logs --tail 80 backend >&2
  exit 1
fi

"${COMPOSE[@]}" ps
echo "Despliegue completado."
