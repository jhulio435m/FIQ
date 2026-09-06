---
name: fastapi-backend
description: Use when building or modifying the FIQ FastAPI backend: routers, services, CRUD, SQLModel models, Pydantic schemas, auth/RBAC, uploads, activity logging, OpenAPI, and backend tests.
---

# FastAPI Backend — FIQ Project

## Stack
- FastAPI + SQLModel/SQLAlchemy 2.0 async + Pydantic v2
- PostgreSQL 17 + Redis 7
- MongoDB for activity/event cache paths when enabled
- MinIO/S3 for resource files
- Alembic for migrations
- python-jose for JWT, passlib/bcrypt for passwords
- FastAPI Users where existing auth/user-manager code already uses it
- pydantic-settings for config, UV for dependency management

## Architecture
Prefer the existing FIQ domain pattern:

```text
app/api/<domain>/
├── models.py
├── schemas.py
├── crud.py
├── service.py
└── router.py
```

Shared models can live in `app/models/`. Shared config, DB, auth, cache, S3 and seed code lives in `app/core/`.

Flow: `Router -> Service (optional) -> CRUD -> Model`.

- Routers handle HTTP concerns only.
- Services contain business rules.
- CRUD is the only layer that touches SQL.
- Use `AsyncSession` from `sqlmodel.ext.asyncio.session`.
- Use `select()`/`session.exec()` or the established local async style; do not introduce sync DB calls in async endpoints.

## Auth and RBAC
- JWT is sent as `Authorization: Bearer <token>`.
- Preserve roles: `Admin`, `Docente`, `Estudiante`.
- Protected upload/admin endpoints return `401` for missing/invalid auth and `403` for authenticated users without the role.
- Use `app/core/dependencies.py` helpers such as `get_current_user()` and `require_role("Admin")`.

## API Conventions
- Prefixes: `/auth`, `/users`, `/resources`, `/labs`, `/activity`, `/reports`.
- Pagination: `skip`/`limit` query params unless an existing endpoint uses another documented contract.
- File upload: `UploadFile` + `Form(...)` in multipart.
- Response models use Pydantic v2 and `model_config = {"from_attributes": True}`.
- Explicit response models are required to avoid leaking hashes, tokens, internal paths, S3 secrets, Mongo metadata, or stack traces.

## Resource and Upload Rules
- Validate file size, extension, MIME type and safe filename before storing.
- Log rejected uploads through the existing activity/log path when available.
- Public resource lists expose only approved records.
- View/download counters must persist and be covered by tests when changed.
- External catalog imports must keep source attribution and treat third-party payloads as untrusted.

## Verification
Run the smallest relevant gate first, then broaden if behavior crosses modules:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

For API contract changes also run:

```bash
npm run openapi:check
```
