#!/usr/bin/env sh
set -eu

sed \
  -e "s|\${NODE1_IP}|${NODE1_IP}|g" \
  -e "s|\${NODE2_IP}|${NODE2_IP}|g" \
  -e "s|\${NODE3_IP}|${NODE3_IP}|g" \
  /usr/local/etc/haproxy/haproxy.cfg.tpl \
  > /tmp/haproxy.cfg

exec haproxy -f /tmp/haproxy.cfg
