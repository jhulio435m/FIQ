#!/bin/bash

# Este script automatiza el despliegue de la base de datos HA en los 3 nodos
# Se debe ejecutar desde el VPS Principal

NODE1_IP="38.43.155.154"
NODE2_IP="172.202.106.64"
NODE3_IP="64.236.184.42"
KEY2="/home/blink/Descargas/azure_key.pem"
KEY3="/home/blink/vps_jin/azure_key.pem"

deploy_node() {
    local id=$1
    local ip=$2
    local key=$3
    echo "--- Desplegando DB HA en Nodo $id ($ip) ---"
    
    # Crear directorio si no existe
    if [ "$id" == "1" ]; then
        cp ha-database/.env.ha ha-database/.env
        sed -i "s/NODE_ID=.*/NODE_ID=$id/" ha-database/.env
        sed -i "s/NODE_IP=.*/NODE_IP=$ip/" ha-database/.env
        docker compose -f ha-database/docker-compose.ha.yml up -d --build
    else
        ssh -o StrictHostKeyChecking=no -i $key azureuser@$ip "mkdir -p ~/FIQ/ha-database"
        scp -i $key ha-database/docker-compose.ha.yml ha-database/Dockerfile.patroni ha-database/haproxy.cfg ha-database/patroni.yml azureuser@$ip:~/FIQ/ha-database/
        
        # Crear .env específico para el nodo
        ssh -i $key azureuser@$ip "cat <<EOF > ~/FIQ/ha-database/.env
NODE_ID=$id
NODE_IP=$ip
NODE1_IP=$NODE1_IP
NODE2_IP=$NODE2_IP
NODE3_IP=$NODE3_IP
POSTGRES_PASSWORD=94d68a05f4e613b1b05eee4f
REPLICATION_PASSWORD=fiq_repl_secret_2026
EOF"
        ssh -i $key azureuser@$ip "cd ~/FIQ/ha-database && docker compose -f docker-compose.ha.yml up -d --build"
    fi
}

# Desplegar en los 3 nodos
deploy_node 1 $NODE1_IP ""
deploy_node 2 $NODE2_IP $KEY2
deploy_node 3 $NODE3_IP $KEY3

echo "🚀 Clúster Patroni + etcd + HAProxy desplegado."
echo "Puedes ver las estadísticas de HAProxy en http://<CUALQUIER_IP>:7000/"
