# Monitoreo en `oti`

Stack liviano para monitorear el VPS de laboratorio:

- Grafana: `127.0.0.1:13000`
- Prometheus: `127.0.0.1:19090`
- Node Exporter: `127.0.0.1:19100`

Los puertos se publican solo en loopback. Para acceso externo temporal usar trycloudflare:

```bash
cloudflared tunnel --url http://127.0.0.1:13000
```

## Despliegue

```bash
cd /opt/fiq-monitoring-source
./deploy_monitoring.sh
```

La contraseña admin de Grafana se genera en el VPS y queda en:

```text
~/fiq-monitoring/grafana-admin-password
```

No versionar esa contraseña.
