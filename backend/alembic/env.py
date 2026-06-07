from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.core.config import settings
from app.models.user import Rol, User
from app.models.resource import Curso, EstadoRecurso, Recurso, RecursoEstadoHistorial, TipoRecurso
from app.api.labs.models import NivelDificultad, ModuloLaboratorio
from app.models.activity import RegistroActividad, TipoActividad

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    config.set_main_option(
        "sqlalchemy.url",
        settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://"),
    )
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
