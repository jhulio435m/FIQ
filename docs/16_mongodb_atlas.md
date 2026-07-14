# 16. Integración MongoDB Atlas

MongoDB Atlas puede reemplazar al MongoDB local/replica set para las colecciones documentales de FIQ:

- `activity_events`
- `external_catalog_cache`

PostgreSQL sigue siendo la base transaccional principal.

## Variables

Backend:

```env
MONGO_ENABLED=true
MONGO_URL=mongodb+srv://fiq_app:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=FIQ
MONGO_DB_NAME=fiq_events
MONGO_ACTIVITY_COLLECTION=activity_events
MONGO_EXTERNAL_CACHE_COLLECTION=external_catalog_cache
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
```

Backups GitHub Actions:

```bash
gh secret set MONGO_BACKUP_URI --body "mongodb+srv://fiq_backup:<password>@<cluster>.mongodb.net/fiq_events?retryWrites=true&w=majority&appName=FIQBackup"
gh secret set MONGO_BACKUP_DB --body "fiq_events"
```

Kubernetes:

```yaml
stringData:
  MONGO_URL: mongodb+srv://fiq_app:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=FIQ
```

## Atlas

1. Crear un cluster Atlas.
2. Crear usuario `fiq_app` con permisos mínimos de lectura/escritura sobre `fiq_events`.
3. Crear usuario `fiq_backup` con permisos de lectura para backup sobre `fiq_events`.
4. Agregar a Network Access las IPs de salida de los nodos que conectarán a Atlas.
5. Copiar la connection string de Atlas en formato `mongodb+srv://`.
6. Activar `MONGO_ENABLED=true` en el backend.

Atlas exige TLS para conexiones de clientes y requiere que el origen esté permitido en la IP Access List. La aplicación ya usa PyMongo, por lo que `mongodb+srv://` funciona sin cambios de código.

## Backups sin snapshots externos

No se usan snapshots externos en esta arquitectura. Hay dos capas:

- Backups administrados de Atlas, configurados dentro del panel de Atlas si el tier lo soporta.
- Dumps lógicos controlados por GitHub Actions con `mongodump`, guardados en `BACKUP_ROOT` del host remoto.

Para el dump lógico, `MONGO_BACKUP_URI` debe incluir la base `fiq_events` en el path de la URI. Ejemplo:

```text
mongodb+srv://fiq_backup:<password>@<cluster>.mongodb.net/fiq_events?retryWrites=true&w=majority
```

## Validación

Desde el host de backups:

```bash
BACKUP_ROOT=/var/backups/fiq \
MONGO_BACKUP_URI='mongodb+srv://fiq_backup:<password>@<cluster>.mongodb.net/fiq_events?retryWrites=true&w=majority' \
MONGO_BACKUP_DB=fiq_events \
bash /tmp/fiq_backup_datastores.sh
```

Luego:

```bash
bash deploy_scripts/restore_verify.sh /var/backups/fiq/<timestamp>
```

## Decisión Recomendada

Para producción inicial, Atlas aporta más valor que operar MongoDB replica set propio porque reduce carga operativa de backups, failover, parches y monitoreo. Mantener PostgreSQL HA separado y usar Atlas solo para datos documentales conserva la arquitectura de doble base de datos sin meter todos los datos del producto en MongoDB.
