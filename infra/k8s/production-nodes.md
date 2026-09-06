# Topologia Kubernetes de produccion FIQ

## Objetivo

Produccion debe ejecutarse sobre Kubernetes. Docker Compose queda como artefacto
de laboratorio o rollback temporal, no como runtime objetivo.

## Nodos de quorum

| Nodo Kubernetes | Host | IP Tailscale | Rol |
| --- | --- | --- | --- |
| `parrot` | `oti` | `100.79.244.99` | k3s server, etcd, Patroni, HAProxy |
| `abc` | Ubuntu | `100.97.171.89` | k3s server, etcd, Patroni, HAProxy, app |
| `server` | Ubuntu | `100.87.33.2` | k3s server, etcd, Patroni, HAProxy, app |
| `arch` | local | `100.110.204.72` | k3s server, etcd, Patroni, HAProxy |
| `debian` | jhulio Debian | `100.94.200.89` | k3s server, etcd, Patroni, HAProxy |

Todos los nodos de quorum deben tener la etiqueta:

```bash
kubectl label node <node> fiq.uncp.edu.pe/postgres-ha=true --overwrite
```

Los dos nodos que alojan app, Redis, MinIO, Cloudflare Tunnel y shards:

```bash
kubectl label node abc server fiq.uncp.edu.pe/app=true --overwrite
```

## Watcher externo

`ocri` (`jhulio@167.234.255.122`) no participa en el quorum. El bot principal
permanece como `fiq-telegram-bot.service` porque contiene la logica operacional
existente. No levantar otro consumidor de Telegram con el mismo token.

## Componentes Kubernetes

- `k3s embedded etcd`: quorum distribuido en los 5 nodos `server`.
- `patroni`: `DaemonSet` hostNetwork en los 5 nodos de quorum, usando Kubernetes DCS.
- `postgres-haproxy`: `DaemonSet` hostNetwork con escritura `:5000`, lectura `:5001` y stats `:7000`.
- `resource-shard`: `StatefulSet` de 2 shards PostgreSQL.
- `backend`: `Deployment` HA con sharding real por `curso_id`.
- `frontend`: `Deployment` HA.
- `redis`, `minio`, `cloudflare-tunnel`: servicios auxiliares del runtime.

## Orden operativo

1. Instalar k3s HA en los 5 nodos usando Tailscale como red de control.
2. Crear `fiq-secrets` real desde `.env.prod`; no versionar secretos.
3. Importar o publicar las imagenes `fiq-backend`, `fiq-frontend` y `fiq-patroni:postgres17`.
4. Etiquetar nodos:

   ```bash
   kubectl label node parrot abc server arch debian fiq.uncp.edu.pe/postgres-ha=true --overwrite
   kubectl label node abc server fiq.uncp.edu.pe/app=true --overwrite
   ```

5. Aplicar `kubectl apply -k infra/k8s/overlays/production`.
6. Ejecutar Alembic y seed desde un `Job` o `kubectl exec` al backend.
7. Validar `kubectl get pods -n fiq-prod -o wide`, `/health`, HAProxy y Patroni.
8. Apagar Compose solo cuando Kubernetes responda y el watcher externo marque todo en OK.

## Scripts

- `infra/k8s/bootstrap-k3s.sh`: instala el cluster k3s HA.
- `infra/k8s/create-secret-from-env.sh`: crea `fiq-secrets` desde un archivo local no versionado.
