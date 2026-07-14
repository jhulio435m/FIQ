#!/bin/bash
set -e

# Configuración de IPs y Claves SSH
NODE2_IP="172.202.106.64" # VPS 2 (IP pública)
NODE3_IP="10.77.0.1"      # VPS 3 (IP privada Wireguard, accesible vía proxy jump en NODE2)

KEY2="/home/blink/Descargas/azure_key.pem"
KEY3="/home/blink/vps_jin/azure_key.pem"

# Generar contraseñas seguras para la base de datos y secretos
DB_PASSWORD=$(openssl rand -hex 12)
REPL_PASSWORD=$(openssl rand -hex 12)
SECRET_KEY=$(openssl rand -hex 32)
S3_SECRET_KEY=$(openssl rand -hex 12)

echo "🔑 Contraseñas y secretos generados dinámicamente:"
echo "POSTGRES_PASSWORD: $DB_PASSWORD"
echo "REPLICATION_PASSWORD: $REPL_PASSWORD"
echo "SECRET_KEY: $SECRET_KEY"

# Funciones de SSH/SCP para VPS 3 (vía VPS 2 como Proxy Jump)
ssh_vps3() {
    ssh -o StrictHostKeyChecking=no -i "$KEY3" -o ProxyCommand="ssh -o StrictHostKeyChecking=no -i $KEY2 -W %h:%p azureuser@$NODE2_IP" azureuser@$NODE3_IP "$@"
}

scp_vps3() {
    local args=("$@")
    local num_args=${#args[@]}
    local dest="${args[num_args-1]}"
    local files=("${args[@]:0:num_args-1}")
    scp -o StrictHostKeyChecking=no -i "$KEY3" -o ProxyCommand="ssh -o StrictHostKeyChecking=no -i $KEY2 -W %h:%p azureuser@$NODE2_IP" "${files[@]}" azureuser@$NODE3_IP:"$dest"
}

# 1. Crear red Docker fiq-network en VPS 2 y VPS 3 si no existe
echo "--- Creando red Docker fiq-network en VPS 2 ---"
ssh -o StrictHostKeyChecking=no -i $KEY2 azureuser@$NODE2_IP "docker network create fiq-network || true"

echo "--- Creando red Docker fiq-network en VPS 3 ---"
ssh_vps3 "docker network create fiq-network || true"

# 2. Desplegar base de datos HA en VPS 2
echo "--- Copiando ha-database a VPS 2 ($NODE2_IP) ---"
ssh -o StrictHostKeyChecking=no -i $KEY2 azureuser@$NODE2_IP "mkdir -p ~/FIQ/ha-database"
scp -i $KEY2 ha-database/docker-compose.ha.yml ha-database/Dockerfile.patroni ha-database/haproxy.cfg ha-database/patroni.yml azureuser@$NODE2_IP:~/FIQ/ha-database/

echo "--- Configurando .env para DB en VPS 2 ---"
ssh -i $KEY2 azureuser@$NODE2_IP "cat <<EOF > ~/FIQ/ha-database/.env
NODE_ID=2
NODE_IP=10.77.0.2
NODE2_IP=10.77.0.2
NODE3_IP=10.77.0.1
POSTGRES_PASSWORD=$DB_PASSWORD
REPLICATION_PASSWORD=$REPL_PASSWORD
EOF"

echo "--- Levantando DB HA en VPS 2 ---"
ssh -i $KEY2 azureuser@$NODE2_IP "cd ~/FIQ/ha-database && docker compose -f docker-compose.ha.yml down -v || true && docker compose -f docker-compose.ha.yml up -d --build"

# 3. Desplegar base de datos HA en VPS 3 (vía proxy jump en VPS 2)
echo "--- Copiando ha-database a VPS 3 ($NODE3_IP) ---"
ssh_vps3 "mkdir -p ~/FIQ/ha-database"
scp_vps3 ha-database/docker-compose.ha.yml ha-database/Dockerfile.patroni ha-database/haproxy.cfg ha-database/patroni.yml "~/FIQ/ha-database/"

echo "--- Configurando .env para DB en VPS 3 ---"
ssh_vps3 "cat <<EOF > ~/FIQ/ha-database/.env
NODE_ID=3
NODE_IP=10.77.0.1
NODE2_IP=10.77.0.2
NODE3_IP=10.77.0.1
POSTGRES_PASSWORD=$DB_PASSWORD
REPLICATION_PASSWORD=$REPL_PASSWORD
EOF"

echo "--- Levantando DB HA en VPS 3 ---"
ssh_vps3 "cd ~/FIQ/ha-database && docker compose -f docker-compose.ha.yml down -v || true && docker compose -f docker-compose.ha.yml up -d --build"

# 4. Empaquetar y copiar la aplicación principal a VPS 2
echo "--- Empaquetando aplicación principal ---"
tar --exclude='node_modules' --exclude='.git' --exclude='*.pem' --exclude='venv' --exclude='frontend/node_modules' -czf fiq-app.tar.gz backend frontend docker-compose.prod.yml documento\ de\ prueba.pdf

echo "--- Copiando aplicación a VPS 2 ---"
scp -i $KEY2 fiq-app.tar.gz azureuser@$NODE2_IP:~/FIQ/
rm fiq-app.tar.gz

echo "--- Descomprimiendo aplicación en VPS 2 ---"
ssh -i $KEY2 azureuser@$NODE2_IP "cd ~/FIQ && tar -xzf fiq-app.tar.gz && rm fiq-app.tar.gz"

# 5. Generar archivo .env.prod para la aplicación en VPS 2
echo "--- Creando .env.prod en VPS 2 ---"
ssh -i $KEY2 azureuser@$NODE2_IP "cat <<EOF > ~/FIQ/.env.prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=fiq_prod
REDIS_URL=redis://redis:6379/0
SECRET_KEY=$SECRET_KEY
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=$S3_SECRET_KEY
S3_BUCKET_NAME=fiq-uploads
CORS_ORIGINS=[\"*\"]
VITE_API_URL=/api
EOF"

# 6. Levantar la aplicación en VPS 2
echo "--- Levantando aplicación en VPS 2 ---"
ssh -i $KEY2 azureuser@$NODE2_IP "cd ~/FIQ && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

# 7. Ejecutar base de datos seed para inicializar tablas y admin
echo "--- Sincronizando base de datos y cargando seed en VPS 2 ---"
echo "⏳ Esperando 15 segundos para que la DB inicialice..."
sleep 15
echo "--- Creando base de datos fiq_prod si no existe ---"
ssh -i $KEY2 azureuser@$NODE2_IP "docker exec -i -e PGPASSWORD=$DB_PASSWORD ha-database-patroni-1 psql -U postgres -h localhost -c \"CREATE DATABASE fiq_prod;\" || true"
ssh -i $KEY2 azureuser@$NODE2_IP "docker compose -f ~/FIQ/docker-compose.prod.yml --env-file ~/FIQ/.env.prod exec -T backend python -m app.core.seed"

# 8. Mostrar URL de TryCloudflare
echo "⏳ Esperando a que el túnel de Cloudflare genere la URL..."
sleep 10
ssh -i $KEY2 azureuser@$NODE2_IP "docker compose -f ~/FIQ/docker-compose.prod.yml logs tunnel | grep -o 'https://.*trycloudflare.com'" || echo "⚠️ No se pudo obtener la URL de Cloudflare. Por favor revisa los logs del contenedor tunnel."

echo "🚀 Despliegue completado con éxito."
