# 14. Plan de Producción HA, Kubernetes/Swarm y Power BI

## Decisión de Orquestación

Kubernetes y Docker Swarm no se deben mezclar como un único plano de control. Para FIQ se define:

- **Kubernetes:** destino recomendado para producción HA y evolución institucional.
- **Docker Swarm:** alternativa operativa si el equipo necesita un clúster más simple en VPS antes de adoptar Kubernetes.
- **Docker Compose:** entorno local y laboratorio, no frontera final de alta disponibilidad.

## Topología Real Seleccionada

El clúster HA se planifica con tres nodos de capacidad suficiente y un watcher externo:

| Nodo | Host | Acceso | Rol previsto | IP privada objetivo |
| :--- | :--- | :--- | :--- | :--- |
| `fiq-node-1` | `100.79.244.99` | `oti@100.79.244.99` | Kubernetes server, PostgreSQL, MongoDB | `10.77.0.1` |
| `fiq-node-2` | `147.224.242.204` | `ubuntu@147.224.242.204` | Kubernetes server, PostgreSQL, MongoDB | `10.77.0.2` |
| `fiq-node-3` | `arch` local | este equipo, Tailscale `100.126.122.28` | Kubernetes server, PostgreSQL, MongoDB | `10.77.0.3` |
| `fiq-watcher-1` | `167.234.255.122` | `jhulio@167.234.255.122` | Watcher externo, health checks, alertas | `10.77.0.10` opcional |

Esta topología sí permite quorum de 3 miembros para Kubernetes/etcd, Patroni y MongoDB, siempre que el nodo local permanezca encendido y conectado. Si `fiq-node-3` no puede estar disponible de forma estable, el tercer nodo debe moverse a un VPS dedicado.

`fiq-watcher-1` no debe alojar datos ni control-plane: tiene `sudo`, pero solo cerca de 1 GiB RAM. Su valor es monitoreo externo y alerta temprana.

Estado operativo inicial:

- `fiq-node-1` ya tiene Tailscale y `wireguard-tools`.
- `fiq-node-2` tiene `sudo` sin contraseña, 4 vCPU, 23 GiB RAM y 45 GiB de disco; pendiente instalar WireGuard/k3s.
- `fiq-node-3` ya tiene Tailscale y `wireguard-tools`.
- `fiq-watcher-1` tiene `sudo`, 2 vCPU y 1 GiB RAM; usar solo para watcher.

Para pruebas, se evaluó crear una VM dentro de `fiq-node-2`, pero el host no expone virtualización KVM (`vmx/svm = 0`). La alternativa de laboratorio es usar Kubernetes en contenedores con `infra/lab/oti-kubernetes/`, aceptando que no representa alta disponibilidad real.

## Arquitectura Objetivo

```mermaid
flowchart TD
    User[Usuarios FIQ] --> Cloudflare[Cloudflare WAF + Access]
    Cloudflare --> Tunnel[Cloudflare Tunnel]
    Tunnel --> Ingress[Ingress / Reverse Proxy]
    Ingress --> Frontend[Frontend React]
    Ingress --> Backend[FastAPI API]

    Backend --> PostgresHA[(PostgreSQL HA Patroni)]
    Backend --> MongoRS[(MongoDB Replica Set)]
    Backend --> Redis[(Redis)]
    Backend --> ObjectStorage[(S3 / MinIO)]

    Backend --> PowerBI[API publica Power BI]
    PostgresHA --> Backups[Backups + Restore Tests]
    MongoRS --> Backups
    ObjectStorage --> Backups
    Backend --> Observability[Logs + Metrics + Alerts]
```

## Fases

### Fase 0: Base ya disponible

- `compose.yaml` local con PostgreSQL, MongoDB, Redis, MinIO, backend y frontend.
- PostgreSQL HA iniciado con Patroni/etcd/HAProxy en `ha-database/`.
- MongoDB documental para `activity_events` y `external_catalog_cache`.
- API Power BI con `/reports/public/*` protegida por `DASHBOARD_API_KEY`.

### Fase 1: Hardening de Configuración

- Separar `compose.yaml` local y `compose.prod.yaml` si se mantiene VPS.
- Sacar secretos de archivos versionados: usar `.env.prod`, Docker secrets, Kubernetes Secrets o External Secrets.
- Definir rotación de `SECRET_KEY`, `DASHBOARD_API_KEY`, credenciales S3, PostgreSQL y MongoDB.
- Activar CORS explícito para frontend, Power BI y dominios institucionales.
- Evitar exponer puertos de bases de datos públicamente; solo red interna o VPN.

### Fase 2: MongoDB Seguro y HA

Objetivo: replica set de 3 miembros en nodos distintos.

- `mongo-0` en `fiq-node-1`, `mongo-1` en `fiq-node-2`, `mongo-2` en `fiq-node-3`, con persistencia independiente.
- Autenticación obligatoria.
- Keyfile interno para autenticación entre réplicas.
- TLS interno si el clúster cruza redes no confiables.
- Usuario app con permisos mínimos sobre `fiq_events`.
- Usuario backup solo lectura.
- Backups con `mongodump --oplog` o snapshots consistentes.
- Restore test mensual en entorno aislado.

### Fase 3: PostgreSQL HA

Mantener Patroni/etcd/HAProxy como línea base:

- 3 nodos PostgreSQL sobre `10.77.0.1`, `10.77.0.2`, `10.77.0.3`.
- 3 nodos etcd o servicio equivalente estable sobre los mismos hosts.
- HAProxy o PgBouncer para entrada estable.
- Backups base + WAL archiving.
- Restore test documentado.
- Métricas de replicación, lag y failover.

### Fase 4: Kubernetes

Crear `infra/k8s/` con:

- `Namespace` por entorno: `fiq-staging`, `fiq-prod`.
- `Deployment` para backend, frontend y cloudflared.
- `Service` interno para backend/frontend.
- `Ingress` si no se usa solo Cloudflare Tunnel.
- `ConfigMap` para configuración no sensible.
- `Secret` o ExternalSecret para credenciales.
- `CronJob` para backups.
- `NetworkPolicy` para aislar bases de datos.
- Probes: readiness/liveness/startup.
- Requests/limits por pod.
- HPA para backend y frontend.

Base de datos en Kubernetes:

- Preferible usar operadores: CloudNativePG/Zalando para PostgreSQL y MongoDB Community/Enterprise Operator para MongoDB.
- Si no se usan operadores, mantener Postgres/Mongo fuera del clúster y conectar por red privada/VPN.

### Fase 5: Docker Swarm Fallback

Crear `infra/swarm/` con:

- Stack file `fiq-stack.yaml`.
- Overlay network.
- Docker secrets.
- Replicas de backend/frontend.
- Servicios externos para PostgreSQL HA y Mongo replica set.
- Rolling update y rollback config.
- Healthchecks obligatorios.

Swarm no debe administrar datos críticos sin una estrategia clara de volúmenes por nodo, backups y recuperación.

### Fase 6: Observabilidad

Mínimo aceptable:

- Logs centralizados del backend, frontend, cloudflared, PostgreSQL, MongoDB y backups.
- Métricas HTTP: latencia p95, 4XX, 5XX, throughput.
- Métricas DB: conexiones, locks, replicación, tamaño, cache hit, slow queries.
- Alertas: API caída, error 5XX alto, disco > 80%, backup fallido, replica lag, Mongo primary no disponible.
- Dashboard técnico separado del dashboard académico Power BI.

### Fase 7: Power BI

No conectar Power BI directo a PostgreSQL ni MongoDB. Usar API pública controlada:

- `GET /reports/public/dashboard-data`
- `GET /reports/public/resources`
- `GET /reports/public/courses`
- `GET /reports/public/users`
- `GET /reports/public/activities`
- `GET /reports/public/document-metrics`

Seguridad:

- `DASHBOARD_API_KEY` obligatorio.
- Cloudflare WAF/rate limit.
- Respuestas agregadas, no secretos ni tokens.
- No exponer contraseñas, URLs internas ni campos sensibles.
- Logs de acceso para auditoría.

Modelo Power BI:

- Tabla `resources`: recursos, tipos, cursos, vistas, descargas.
- Tabla `activities`: eventos SQL por fecha/tipo.
- Tabla `document_metrics.activity_events.by_type`: eventos Mongo por tipo.
- Tabla `document_metrics.activity_events.by_date`: eventos Mongo por fecha.
- Tabla `document_metrics.external_catalog_cache.by_kind`: búsquedas externas por tipo.
- Tabla `document_metrics.external_catalog_cache.recent`: snapshots recientes del cache externo.

## Criterios de Listo

- `docker compose config` sin warnings.
- `uv run --extra dev python -m pytest` pasando.
- `npm run openapi:check` pasando.
- Secretos fuera del repo.
- Backups ejecutados y restore probado.
- Endpoint Power BI con API key y dataset validado.
- Runbook de failover PostgreSQL y MongoDB.
- Monitoreo con alertas probadas.
