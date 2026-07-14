import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.labs.models import ModuloLaboratorio, NivelDificultad
from app.core.database import get_db
from app.main import app
from app.models.activity import TipoActividad
from app.models.resource import Curso, EstadoRecurso, Recurso, TipoRecurso
from app.models.user import Rol, User


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, future=True)
TestingSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(autouse=True)
async def database() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()


async def seed_reference_data(db: AsyncSession) -> dict[str, uuid.UUID]:
    admin_id = uuid.uuid4()
    teacher_id = uuid.uuid4()
    student_id = uuid.uuid4()
    db.add_all(
        [
            Rol(id=1, nombre="Admin", descripcion="Administrador"),
            Rol(id=2, nombre="Docente", descripcion="Docente"),
            Rol(id=3, nombre="Estudiante", descripcion="Estudiante"),
            TipoRecurso(id=1, nombre="Libro"),
            TipoRecurso(id=2, nombre="Tesis"),
            EstadoRecurso(id=1, nombre="Pendiente"),
            EstadoRecurso(id=2, nombre="Aprobado"),
            EstadoRecurso(id=3, nombre="Observado"),
            EstadoRecurso(id=5, nombre="Archivado"),
            Curso(id=1, nombre="Química General", codigo="QUI101"),
            TipoActividad(id=1, nombre="login"),
            TipoActividad(id=4, nombre="upload"),
            TipoActividad(id=8, nombre="resource_archive"),
            TipoActividad(id=9, nombre="upload_rejected"),
            NivelDificultad(id=1, nombre="Básico"),
            ModuloLaboratorio(
                id=1,
                titulo="Operaciones Unitarias I",
                descripcion="Balances de materia y energia.",
                url_simulacion="/labs/operaciones",
                nivel_id=1,
            ),
            User(
                id=admin_id,
                email="admin@fiq.uncp.edu.pe",
                hashed_password="$2b$12$M0d1hC5fMin.k3lReP0NP.CBNPEI3MqbiriI7Ti.Bw1Wpb.EwApVi",
                nombre="Admin FIQ",
                rol_id=1,
                is_active=True,
                is_superuser=True,
                is_verified=True,
                esta_activo=True,
            ),
            User(
                id=teacher_id,
                email="docente@fiq.uncp.edu.pe",
                hashed_password="$2b$12$M0d1hC5fMin.k3lReP0NP.CBNPEI3MqbiriI7Ti.Bw1Wpb.EwApVi",
                nombre="Docente FIQ",
                rol_id=2,
                is_active=True,
                is_superuser=False,
                is_verified=True,
                esta_activo=True,
            ),
            User(
                id=student_id,
                email="estudiante@fiq.uncp.edu.pe",
                hashed_password="$2b$12$M0d1hC5fMin.k3lReP0NP.CBNPEI3MqbiriI7Ti.Bw1Wpb.EwApVi",
                nombre="Estudiante FIQ",
                rol_id=3,
                is_active=True,
                is_superuser=False,
                is_verified=True,
                esta_activo=True,
            ),
        ]
    )
    await db.commit()
    return {"admin_id": admin_id, "teacher_id": teacher_id, "student_id": student_id}
