#!/bin/bash

# Este script debe ejecutarse en el VPS Principal
echo "🚀 Iniciando despliegue en VPS Principal..."

# 1. Generar secretos si no existen
if [ ! -f .env.prod ]; then
    echo "Generando archivo .env.prod..."
    SECRET_KEY=$(openssl rand -hex 32)
    cat <<EOF > .env.prod
POSTGRES_USER=fiq_admin
POSTGRES_PASSWORD=$(openssl rand -hex 12)
POSTGRES_DB=fiq_prod
DATABASE_URL=postgresql://fiq_admin:\${POSTGRES_PASSWORD}@postgres:5432/fiq_prod
REDIS_URL=redis://redis:6379/0
SECRET_KEY=\$SECRET_KEY
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=$(openssl rand -hex 12)
S3_BUCKET_NAME=fiq-uploads
CORS_ORIGINS=["*"]
VITE_API_URL=/api
EOF
fi

# 2. Levantar servicios
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. Mostrar URL de TryCloudflare
echo "⏳ Esperando a que el túnel de Cloudflare genere la URL..."
sleep 10
docker-compose -f docker-compose.prod.yml logs tunnel | grep "trycloudflare.com"
