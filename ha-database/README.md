# PostgreSQL HA con Patroni, etcd y HAProxy

Este paquete implementa la pieza que faltaba para alta disponibilidad real de datos SQL:

- Patroni controla el lider PostgreSQL y promueve una replica si el lider cae.
- etcd guarda el consenso del cluster Patroni.
- HAProxy expone un endpoint estable para la aplicacion.

## Nodos objetivo

| Nodo | Rol | IP privada |
| --- | --- | --- |
| `oti` | PostgreSQL + Patroni + etcd + HAProxy | `100.79.244.99` |
| `ubuntu` | PostgreSQL + Patroni + etcd + HAProxy | `100.97.171.89` |
| `laptop` | PostgreSQL + Patroni + etcd + HAProxy | `100.126.122.28` |

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
- `2379-2380`: etcd.

## Flujo de despliegue

1. Crear backup actual de PostgreSQL.
2. Levantar Patroni/etcd/HAProxy:

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
