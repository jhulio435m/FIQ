# FIQ Kubernetes

Este directorio contiene los manifiestos Kubernetes de staging y producción.
Producción debe correr sobre `k3s` HA en los cinco nodos de quorum conectados por
Tailscale.

## Estructura prevista

```text
infra/k8s/
├── base/
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── services.yaml
│   ├── configmap.yaml
│   ├── secrets.example.yaml    # plantilla, no se aplica en production
│   ├── network-policies.yaml
│   └── backup-cronjobs.yaml
└── overlays/
    ├── staging/
    └── production/
```

## Reglas

- No versionar secretos reales.
- Usar `Secret`, SealedSecrets o External Secrets.
- Bases de datos críticas con operadores o servicios HA externos.
- `readinessProbe`, `livenessProbe`, requests y limits obligatorios.
- Cloudflare Tunnel o Ingress controlado como entrada pública.

## Nodos objetivo actuales

- `parrot`: `oti@100.79.244.99`.
- `abc`: `ubuntu@147.224.242.204`, Tailscale `100.97.171.89`.
- `server`: `ubuntu@147.15.114.98`, Tailscale `100.87.33.2`.
- `arch`: host local, Tailscale `100.110.204.72`.
- `debian`: `jhulio@100.94.200.89`.
- `ocri`: `jhulio@167.234.255.122`, watcher externo con el bot principal por systemd.

Los cinco primeros nodos participan como `k3s server` con quorum. `ocri` no
participa en el cluster ni en el quorum.

## Runtime cubierto

- PostgreSQL HA: `Patroni` y `HAProxy` como `DaemonSet` hostNetwork en 5 nodos, con consenso mediante Kubernetes DCS sobre el etcd embebido de k3s.
- Recursos shardeados: `resource-shard` como `StatefulSet` de 2 replicas.
- Aplicacion: `backend`, `frontend`, `redis`, `minio` y `cloudflare-tunnel`.
- Observabilidad externa: watcher/bot principal en `ocri` por systemd.

Aplicar produccion:

```bash
infra/k8s/create-secret-from-env.sh .env.prod fiq-prod
kubectl apply -k infra/k8s/overlays/production
```

Antes de apagar Compose, validar:

```bash
kubectl get nodes -o wide
kubectl get pods -n fiq-prod -o wide
kubectl get endpoints -n fiq-prod postgres-ha resource-shard
```
