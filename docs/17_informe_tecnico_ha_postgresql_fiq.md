# Informe Tecnico de Alta Disponibilidad FIQ

Este documento resume la arquitectura real desplegada para la Plataforma Digital FIQ al 22 de julio de 2026. La implementacion usa Kubernetes k3s, PostgreSQL 17, Patroni, HAProxy, Redis, MinIO, Prometheus, Grafana, Cloudflare Tunnel, sharding PostgreSQL y un watcher externo con Telegram.

## 1. Resumen ejecutivo

La plataforma opera sobre un cluster Kubernetes k3s de cinco nodos conectados por Tailscale. La capa de datos principal usa PostgreSQL HA con Patroni y HAProxy. La aplicacion se expone por Cloudflare Tunnel y los recursos academicos se distribuyen en dos shards PostgreSQL.

El runtime de produccion es Kubernetes. Docker Compose queda apagado y solo se conserva como rollback manual o laboratorio.

## 2. Nodos

| Nodo | IP Tailscale | Rol |
| :--- | :--- | :--- |
| `abc` | `100.97.171.89` | k3s, etcd, Patroni, HAProxy, app, tunnel, shard |
| `server` | `100.87.33.2` | k3s, etcd, Patroni, HAProxy, app, tunnel, shard |
| `arch` | `100.110.204.72` | k3s, etcd, Patroni, HAProxy |
| `debian` | `100.94.200.89` | k3s, etcd, Patroni, HAProxy |
| `parrot` | `100.79.244.99` | k3s, etcd, Patroni, HAProxy |
| `ocri` | `100.122.189.103` | watcher externo y bot Telegram systemd |

## 3. Componentes Kubernetes

- `backend`: FastAPI con 2 replicas.
- `frontend`: React con 3 replicas.
- `cloudflare-tunnel`: 2 replicas con protocolo HTTP/2.
- `redis`: cache/servicio auxiliar.
- `minio`: almacenamiento compatible S3.
- `patroni`: DaemonSet hostNetwork en los cinco nodos de datos.
- `postgres-haproxy`: DaemonSet hostNetwork para entrada SQL estable.
- `resource-shard`: StatefulSet PostgreSQL de 2 shards.
- `prometheus`, `kube-state-metrics`, `node-exporter` y `grafana`: observabilidad del cluster, nodos, pods y Patroni.

## 4. PostgreSQL HA

Patroni usa Kubernetes DCS sobre el plano k3s. No se ejecuta un etcd separado para PostgreSQL. HAProxy publica:

- `:5000` para escrituras al lider.
- `:5001` para lecturas a replicas.
- `:7000` para estadisticas.

Estado verificado:

| Miembro | Host | Rol | Estado | Lag |
| :--- | :--- | :--- | :--- | :--- |
| `patroni-k2rfs` | `100.97.171.89` | Leader | running | - |
| `patroni-8htb2` | `100.110.204.72` | Replica | streaming | 0 |
| `patroni-drk6x` | `100.79.244.99` | Replica | streaming | 0 |
| `patroni-mrqg7` | `100.87.33.2` | Replica | streaming | 0 |
| `patroni-ppgd4` | `100.94.200.89` | Replica | streaming | 0 |

## 5. Sharding

La carga de recursos academicos se distribuye en dos shards PostgreSQL:

- `resource-shard-0`: 25 000 registros de prueba.
- `resource-shard-1`: 25 000 registros de prueba.

La distribucion es deterministica por `curso_id`. Este sharding complementa la base transaccional HA y permite repartir datos de biblioteca/recursos.

## 6. Entrada publica

Cloudflare Tunnel expone el frontend y el backend. Actualmente se usan quick tunnels:

- `https://entirely-develop-patent-cordless.trycloudflare.com`
- `https://inquire-floating-mind-employees.trycloudflare.com`

Ambos responden `/api/health` con estado OK. Para produccion formal se debe usar un named tunnel y un subdominio fijo.

## 7. Observabilidad con Prometheus y Grafana

Se agrego observabilidad dentro de Kubernetes:

- `Prometheus`: recolecta metricas del cluster, nodos, kube-state-metrics, node-exporter y Patroni.
- `kube-state-metrics`: expone estado de recursos Kubernetes.
- `node-exporter`: expone metricas de sistema en los cinco nodos.
- `Grafana`: usa Prometheus como datasource y trae el dashboard inicial `FIQ HA Overview`.

Grafana esta expuesto temporalmente por Cloudflare Tunnel:

- `https://opinion-feeding-bali-father.trycloudflare.com`

Este enlace tambien es un quick tunnel; para produccion formal debe reemplazarse por un named tunnel con subdominio fijo.

## 8. Watcher y Telegram

`ocri` se mantiene fuera del quorum. Ejecuta:

- `fiq-watcher.timer` para chequeos periodicos.
- `fiq-watcher.service` como ejecucion puntual del watcher.
- `fiq-telegram-bot.service` como bot principal de Telegram.

Se conserva el bot systemd porque contiene la logica principal. No debe ejecutarse un segundo consumidor Docker con el mismo token.

## 9. Estado operativo

- Aplicacion publica: OK.
- Backend/frontend Kubernetes: OK.
- PostgreSQL Patroni: lider y cuatro replicas en streaming.
- Shards: 2/2 activos.
- Prometheus/Grafana: OK.
- Compose productivo antiguo: apagado en los VPS Ubuntu.
- Watcher/bot en `ocri`: activo por systemd.

Observacion: `parrot` presento estado Kubernetes `NotReady` por timeouts del API/etcd local. Fue reiniciado y `k3s` regreso a `active/running`; tras una fluctuacion inicial, la ultima verificacion mostro nuevamente los cinco nodos `Ready`. La plataforma publica y PostgreSQL HA siguieron operativos durante la degradacion.

## 10. Pendientes

- Crear Cloudflare named tunnel con subdominio fijo.
- Mantener observacion de `parrot`; si vuelve a `NotReady`, removerlo del quorum k3s y reingresarlo limpio.
- Automatizar backups y restore tests.

## 11. Conclusion

La arquitectura real de FIQ ya opera con Kubernetes, PostgreSQL HA, Patroni, HAProxy, sharding, Prometheus/Grafana y watcher externo. El sistema mantiene servicio publico y base de datos replicada, pero debe reemplazar las URLs temporales de Cloudflare por un dominio fijo y mantener observacion del nodo `parrot` despues de su recuperacion.
