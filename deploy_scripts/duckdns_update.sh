#!/bin/bash
# Script para actualizar DuckDNS
# Uso: ./duckdns_update.sh <dominio> <token>

DUCK_DOMAIN=$1
DUCK_TOKEN=$2

if [ -z "$DUCK_DOMAIN" ] || [ -z "$DUCK_TOKEN" ]; then
    echo "Error: Faltan parámetros. Uso: ./duckdns_update.sh <dominio> <token>"
    exit 1
fi

echo "Actualizando DuckDNS para ${DUCK_DOMAIN}.duckdns.org..."
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${DUCK_DOMAIN}&token=${DUCK_TOKEN}&ip=")

if [ "$RESPONSE" == "OK" ]; then
    echo "✅ DuckDNS actualizado correctamente."
else
    echo "❌ Error al actualizar DuckDNS: $RESPONSE"
fi
