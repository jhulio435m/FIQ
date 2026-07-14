# 15. Backups y CI/CD con GitHub Actions

## Objetivo

Dejar GitHub Actions preparado para:

- Ejecutar CI en cada push/PR.
- Ejecutar backups programados de PostgreSQL y MongoDB.
- Desplegar manifiestos Kubernetes por SSH desde un nodo operador.
- Mantener secretos fuera del repositorio.

## Workflows

| Workflow | Archivo | Uso |
| :--- | :--- | :--- |
| CI/CD Pipeline | `.github/workflows/ci.yml` | Tests backend/frontend, OpenAPI, build y E2E. |
| Production Backups | `.github/workflows/backup.yml` | Backup programado/manual por SSH. |
| Deploy Kubernetes | `.github/workflows/deploy-kubernetes.yml` | Aplica `infra/k8s/overlays/<env>` desde un nodo con `kubectl`. |

## Secrets requeridos

### Backups

- `TAILSCALE_AUTHKEY`: opcional, requerido si `BACKUP_SSH_HOST` es IP Tailscale `100.x`.
- `BACKUP_SSH_HOST`: host que ejecuta backups.
- `BACKUP_SSH_USER`: usuario SSH.
- `BACKUP_SSH_KEY`: llave privada SSH.
- `BACKUP_KNOWN_HOSTS`: salida de `ssh-keyscan`.
- `BACKUP_ROOT`: directorio remoto de backups, por ejemplo `/var/backups/fiq`.
- `BACKUP_RETENTION_DAYS`: retención, por ejemplo `14`.
- `POSTGRES_BACKUP_URL`: URL PostgreSQL para `pg_dump`.
- `MONGO_BACKUP_URI`: URI MongoDB para `mongodump`.
- `RESTIC_REPOSITORY`: repositorio restic para snapshots externos, opcional.
- `RESTIC_PASSWORD`: contraseña del repositorio restic, opcional.
- `SNAPSHOT_PATHS`: rutas remotas a snapshotear, opcional; por defecto `BACKUP_ROOT`.
- `SNAPSHOT_TAGS`: tags restic, opcional; por defecto `fiq,production`.

### Deploy Kubernetes

- `TAILSCALE_AUTHKEY`: opcional, requerido si `K8S_SSH_HOST` es IP Tailscale `100.x`.
- `K8S_SSH_HOST`: nodo operador con acceso a `kubectl`.
- `K8S_SSH_USER`: usuario SSH.
- `K8S_SSH_KEY`: llave privada SSH.
- `K8S_KNOWN_HOSTS`: salida de `ssh-keyscan`.

## Configuración con GitHub CLI

El CLI debe estar autenticado:

```bash
gh auth status
gh auth login -h github.com
```

Cargar secrets desde stdin evita dejarlos en el historial:

```bash
gh secret set BACKUP_SSH_HOST --body "100.79.244.99"
gh secret set BACKUP_SSH_USER --body "oti"
gh secret set BACKUP_KNOWN_HOSTS < /tmp/fiq_known_hosts
gh secret set BACKUP_SSH_KEY < ~/.ssh/fiq_actions_ed25519
gh secret set BACKUP_ROOT --body "/var/backups/fiq"
gh secret set BACKUP_RETENTION_DAYS --body "14"
gh secret set POSTGRES_BACKUP_URL --body "postgresql://USER:PASSWORD@10.77.0.1:5432/fiq_db"
gh secret set MONGO_BACKUP_URI --body "mongodb://USER:PASSWORD@10.77.0.1:27017/fiq_events?replicaSet=fiq-rs&authSource=admin"
gh secret set RESTIC_REPOSITORY --body "s3:https://s3.example.edu.pe/fiq-restic"
gh secret set RESTIC_PASSWORD --body "RESTIC_PASSWORD_SEGURA"
gh secret set SNAPSHOT_PATHS --body "/var/backups/fiq"

# Solo si GitHub Actions debe entrar a una IP Tailscale 100.x:
gh secret set TAILSCALE_AUTHKEY --body "tskey-auth-..."

gh secret set K8S_SSH_HOST --body "100.79.244.99"
gh secret set K8S_SSH_USER --body "oti"
gh secret set K8S_KNOWN_HOSTS < /tmp/fiq_known_hosts
gh secret set K8S_SSH_KEY < ~/.ssh/fiq_actions_ed25519
```

## Known hosts

Generar:

```bash
ssh-keyscan -H 100.79.244.99 > /tmp/fiq_known_hosts
ssh-keyscan -H 167.234.255.122 >> /tmp/fiq_known_hosts
```

## Validación de backups

En el host remoto:

```bash
bash deploy_scripts/restore_verify.sh /var/backups/fiq/<timestamp>
```

El job falla si no se configura al menos `POSTGRES_BACKUP_URL` o `MONGO_BACKUP_URI`; esto evita ejecuciones exitosas sin dumps reales. Los snapshots restic son opcionales y solo se ejecutan cuando existen `RESTIC_REPOSITORY` y `RESTIC_PASSWORD`.

La validación mínima verifica checksums. La validación completa debe restaurar en un entorno aislado y ejecutar pruebas de lectura.
