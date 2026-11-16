# FIQ Kubernetes Plan

Este directorio queda reservado para los manifiestos Kubernetes de staging y producción.

## Estructura

```text
infra/k8s/
├── base/
│   ├── configmap.yaml          # ENVIRONMENT=production, CORS, Redis…
│   ├── secrets.example.yaml    # PLANTILLA: no está en kustomization
│   ├── redis.yaml              # refresh tokens + rate limiting
│   ├── migrate-job.yaml        # alembic upgrade head + bootstrap idempotente
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── cloudflared.yaml        # entrada pública (Cloudflare Tunnel con nombre)
│   ├── services.yaml, hpa.yaml, pdb.yaml, network-policies.yaml
│   ├── backup-pvc.yaml
│   └── backup-cronjobs.yaml    # backup diario + restore verificado semanal
└── overlays/
    ├── staging/                # 1 réplica, ENVIRONMENT=staging
    └── production/
```

## Secretos (una sola vez por entorno, fuera del repo)

```bash
NS=fiq-prod   # o fiq-staging
kubectl create namespace $NS
kubectl -n $NS create secret generic fiq-secrets \
  --from-literal=DATABASE_URL='postgresql://fiq_app:<clave>@<haproxy>:5000/fiq_prod' \
  --from-literal=SECRET_KEY="$(openssl rand -hex 32)" \
  --from-literal=S3_ENDPOINT='https://<rustfs-o-s3>' \
  --from-literal=S3_ACCESS_KEY='<access>' \
  --from-literal=S3_SECRET_KEY='<secret>' \
  --from-literal=MONGO_URL='mongodb+srv://…' \
  --from-literal=DASHBOARD_API_KEY="$(openssl rand -hex 24)" \
  --from-literal=BOOTSTRAP_ADMIN_EMAIL='admin@uncp.edu.pe' \
  --from-literal=BOOTSTRAP_ADMIN_PASSWORD="$(openssl rand -base64 18)"
kubectl -n $NS create secret generic fiq-cloudflared --from-literal=TUNNEL_TOKEN='<token>'
kubectl -n $NS create secret generic fiq-backup-secrets \
  --from-literal=POSTGRES_BACKUP_URL='postgresql://…' \
  --from-literal=RESTORE_TEST_URL='postgresql://…/fiq_restore_test'   # base DESECHABLE
```

Si falta una variable o tiene un valor de desarrollo, el backend **no arranca**
(validación en `app/core/config.py`) y el rollout se detiene sin afectar a los pods actuales.

Ajustar `CORS_ORIGINS` en `base/configmap.yaml` (y en el patch de staging) con el dominio real.
En Cloudflare Zero Trust → Tunnels → Public Hostname: `https://<dominio>` → `http://frontend:80`.

## Despliegue (GitHub Actions: `Build & Deploy`)

1. CI completo (`ci.yml`).
2. Build y push de `fiq-backend`, `fiq-frontend` y `fiq-backup-tools` a GHCR con tag `sha-<commit>`.
3. `kubectl kustomize` + reemplazo del tag → `deploy_scripts/split_manifests.sh` separa en fases.
4. Aplica infraestructura → ejecuta el Job `fiq-migrate` y **espera a que termine** → aplica Deployments → `rollout status`.

Push a `main` despliega a staging. Producción: lanzar el workflow manualmente con `environment=production`;
configurar *Required reviewers* en Settings → Environments → production.

Rollback: `kubectl -n fiq-prod rollout undo deployment/backend deployment/frontend`
(las migraciones de Alembic deben ser compatibles hacia atrás con la versión previa).

## Reglas

- No versionar secretos reales; usar Secret creado a mano, SealedSecrets o External Secrets.
- Bases de datos críticas con operadores o servicios HA externos (ver `ha-database/`).
- `readinessProbe` (`/health/ready`), `livenessProbe` (`/health`), requests y limits obligatorios.
- Contenedores sin root, `readOnlyRootFilesystem` y capacidades eliminadas.

## Nodos objetivo

- `fiq-node-1`: `100.79.244.99`, WireGuard `10.77.0.2`.
- `fiq-node-2`: `147.224.242.204`, WireGuard `10.77.0.1`.
- `fiq-node-3`: host local `arch`, WireGuard `10.77.0.3`.
- `fiq-watcher-1`: `167.234.255.122`, watcher externo; no participa en quorum.

Para Kubernetes HA se recomienda `k3s` o `kubeadm` con 3 servers/control-plane. No iniciar el clúster hasta que WireGuard esté activo en los tres nodos y `10.77.0.1/2/3` respondan entre sí.

Los manifiestos base ya declaran alta disponibilidad para la capa stateless:

- `frontend`: 3 réplicas en producción, rolling update con `maxUnavailable=0`, HPA 3-8 y PDB `minAvailable=2`.
- `backend`: 2 réplicas en producción, rolling update con `maxUnavailable=0`, HPA 2-6 y PDB `minAvailable=1`.
- Los overlays `staging` y `production` son aplicables con `kubectl apply -k infra/k8s/overlays/<entorno>`.
