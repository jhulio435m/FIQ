---
name: fastapi-backend
description: Use when building or modifying FastAPI backend endpoints, services, models, or schemas. Covers layered architecture, SQLAlchemy, Pydantic, auth patterns.
---

# FastAPI Backend — FIQ Project

## Stack
- **FastAPI** + SQLAlchemy 2.0 + Pydantic v2
- **PostgreSQL 17** + Redis 7
- **Alembic** for migrations
- **python-jose** for JWT, **passlib[bcrypt]** for passwords
- **pydantic-settings** for config (`.env` file)
- **UV** for dependency management (`pyproject.toml` + `uv.lock`)

## Layered Architecture (per domain)
Each domain module follows:

```
app/api/<domain>/
├── models.py    # SQLAlchemy models
├── schemas.py   # Pydantic request/response
├── crud.py      # DB operations (raw SQLAlchemy queries)
├── service.py   # Business logic (optional, for complex rules)
└── router.py    # FastAPI endpoints
```

## Flow
`Router → Service (optional) → CRUD → Model`

- Routers handle HTTP concerns only (parsing, status codes, deps)
- Services contain business logic
- CRUD is the only layer that touches the DB
- Models define tables, Schemas define JSON shapes

## Auth
- `app/core/security.py`: `hash_password()`, `verify_password()`, `create_access_token()`, `decode_token()`
- `app/core/dependencies.py`: `get_current_user()`, `require_role("Admin")`
- JWT in `Authorization: Bearer <token>` header

## Error handling
- `ValueError` in service → catch in router → raise `HTTPException(400)`
- `HTTPException(401)` for auth, `403` for permissions, `404` for not found

## API conventions
- Prefixes: `/auth`, `/users`, `/resources`, `/labs`, `/activity`, `/reports`
- Pagination: `skip`/`limit` query params
- File upload: `UploadFile` + `Form(...)` in multipart
- Response models: Pydantic schemas with `model_config = {"from_attributes": True}`
