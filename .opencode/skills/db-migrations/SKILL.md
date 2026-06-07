---
name: db-migrations
description: Use when modifying database schemas, creating migrations, or seeding data. Covers Alembic, models, and seed data patterns.
---

# Database Migrations — FIQ Project

## Stack
- SQLAlchemy 2.0 (declarative models)
- Alembic for migrations
- PostgreSQL 17

## Creating a migration
```bash
cd backend
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

## Models
- All models inherit from `app.core.database.Base`
- Define `__tablename__` explicitly
- Use nullable=False for required fields
- Timestamps with `timezone=True`

## Seed data
Create a seed script `backend/seed.py`:
```python
from app.core.database import SessionLocal, engine
from app.core.database import Base
# Create tables and insert initial data
```

Required seed data:
1. **Roles**: Admin, Docente, Estudiante
2. **EstadosRecurso**: Pendiente, Aprobado, Observado, Rechazado, Archivado
3. **TiposRecurso**: Libro, Tesis, Artículo, Manual
4. **NivelesDificultad**: Básico, Intermedio, Avanzado
5. **TiposActividad**: login, search, download, upload, lab_access, resource_approve

## Golden rules
- Never edit existing migration files after they're committed
- If you need to change a migration, create a new one
- Run `alembic upgrade head` before starting development
- Use `alembic downgrade -1` to rollback one step locally
