#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  curl \
  wireguard-tools

sudo install -d -m 0700 /etc/wireguard

if [ ! -f /etc/wireguard/privatekey ]; then
  umask 077
  wg genkey | sudo tee /etc/wireguard/privatekey >/dev/null
fi

sudo sh -c "wg pubkey < /etc/wireguard/privatekey > /etc/wireguard/publickey"
sudo cat /etc/wireguard/publickey
