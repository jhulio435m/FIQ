# FIQ — Backend

FastAPI + SQLModel/SQLAlchemy 2.0 + PostgreSQL + Redis + S3 (RustFS). Dependencias con UV.

## Comandos

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python -m app.core.seed        # SOLO desarrollo: trunca tablas y vacía el bucket (pide --reset si hay datos)
uv run uvicorn app.main:app --reload
uv run --extra dev pytest
uv run python scripts/check_openapi_docs.py   # OpenAPI vs docs/05_especificacion_api.md
```

## Estructura

- `app/core/` — configuración (con validación de producción), base de datos, seguridad, sesiones (refresh tokens), rate limiting, almacén Redis/memoria, S3, observabilidad y `bootstrap.py`.
- `app/api/<dominio>/` — router → service → crud → schemas (auth, users, resources, labs, external_catalog, health).
- `app/logs/`, `app/reports/` — auditoría y reportes.
- `alembic/` — migraciones (no editar las ya commiteadas).

## Producción

`ENVIRONMENT=production` (por defecto en la imagen) exige secretos reales, `REDIS_URL` y `CORS_ORIGINS` explícitos. Cada despliegue ejecuta `alembic upgrade head && python -m app.core.bootstrap`, que es idempotente: catálogos, primer admin desde `BOOTSTRAP_ADMIN_*`, bucket y su CORS.
