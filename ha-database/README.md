# PostgreSQL HA con Patroni y HAProxy

Este paquete conserva la línea PostgreSQL HA. En producción Kubernetes, Patroni
usa Kubernetes DCS sobre el etcd embebido de k3s; el `compose.yaml` queda como
laboratorio o rollback temporal.

- Patroni controla el lider PostgreSQL y promueve una replica si el lider cae.
- Kubernetes DCS guarda el estado del cluster Patroni en producción k3s.
- HAProxy expone un endpoint estable para la aplicacion.

## Nodos objetivo

| Nodo | Rol | IP Tailscale |
| --- | --- | --- |
| `oti` | PostgreSQL + Patroni + HAProxy | `100.79.244.99` |
| `abc` | PostgreSQL + Patroni + HAProxy | `100.97.171.89` |
| `server` | PostgreSQL + Patroni + HAProxy | `100.87.33.2` |
| `arch` | PostgreSQL + Patroni + HAProxy | `100.110.204.72` |
| `debian` | PostgreSQL + Patroni + HAProxy | `100.94.200.89` |

La aplicacion debe escribir contra HAProxy, no contra un nodo PostgreSQL directo:

```text
postgresql://postgres:<password>@100.79.244.99:5000/fiq_prod
```

Puertos:

- `5000`: escritura, apunta solo al lider Patroni.
- `5001`: lectura, apunta a replicas.
- `7000`: dashboard HAProxy.
- `8008`: API Patroni por nodo.
- `5432`: PostgreSQL por nodo.

En Kubernetes, Patroni y HAProxy usan `hostNetwork` para operar sobre las IP
Tailscale de cada nodo. El compose heredado usa `network_mode: host` para
laboratorio y rollback.

## Flujo de despliegue

1. Crear backup actual de PostgreSQL.
2. Levantar Patroni/HAProxy:

```bash
deploy_scripts/deploy_postgres_ha.sh
```

3. Crear/restaurar la base `fiq_prod` en el lider.
4. Cambiar `DATABASE_URL` del backend al endpoint HAProxy `:5000`.
5. Ejecutar migraciones.
6. Probar failover:

```bash
POSTGRES_SUPERUSER_PASSWORD=<password> deploy_scripts/test_postgres_ha_failover.sh
```

## Criterio de listo

PostgreSQL HA solo se considera listo cuando estas pruebas pasan:

- `curl http://<node>:8008/patroni` muestra un solo `master`.
- `psql` contra `:5000` responde antes y despues de apagar el lider.
- HAProxy cambia de lider sin cambiar `DATABASE_URL`.
- El backend conserva acceso tras el failover, con como maximo unos segundos de reconexion.
- Backup y restore test estan verificados.

## Punto clave

Si el backend sigue usando un `DATABASE_URL` directo a un contenedor `postgres`, Patroni no protege al usuario. El failover funciona solo cuando la aplicacion usa HAProxy/PgBouncer como entrada estable.
