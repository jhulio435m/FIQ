import uuid
from sqlalchemy import text
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.user import Rol, User
from app.models.resource import TipoRecurso, EstadoRecurso, Curso
from app.models.activity import TipoActividad
from app.models.lab import NivelDificultad, ModuloLaboratorio
from app.core.security import hash_password

async def truncate_all(conn):
    print("Ensuring tables exist...")
    await conn.run_sync(SQLModel.metadata.create_all)
    
    print("Cleaning database (TRUNCATE)...")
    tables = [
        "registro_actividades", "recurso_estado_historial", "recursos",
        "tipos_recurso", "estados_recurso", "cursos",
        "modulos_laboratorio", "niveles_dificultad", "roles", "\"user\"",
        "tipos_actividad"
    ]
    for table in tables:
        try:
            await conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
        except Exception as e:
            print(f"Skipping truncate for {table}: {e}")

async def seed_roles(db: AsyncSession):
    print("Seeding roles...")
    roles = [
        Rol(id=1, nombre="Admin", descripcion="Administrador del sistema"),
        Rol(id=2, nombre="Docente", descripcion="Docente de la facultad"),
        Rol(id=3, nombre="Estudiante", descripcion="Estudiante de la facultad"),
    ]
    db.add_all(roles)
    await db.flush()

async def seed_admin(db: AsyncSession) -> tuple[uuid.UUID, User]:
    print("Seeding admin...")
    admin_id = uuid.uuid4()
    admin = User(
        id=admin_id,
        email="admin@fiq.uncp.edu.pe",
        hashed_password=hash_password("admin123"),
        nombre="Administrador PRO",
        rol_id=1,
        is_active=True,
        is_superuser=True,
        is_verified=True,
    )
    db.add(admin)
    await db.flush()
    return admin_id, admin

async def seed_tipos_recurso(db: AsyncSession) -> list[TipoRecurso]:
    tipos = [
        TipoRecurso(id=1, nombre="Libro"),
        TipoRecurso(id=2, nombre="Apunte"),
        TipoRecurso(id=3, nombre="Guía de laboratorio"),
        TipoRecurso(id=4, nombre="Tesis"),
    ]
    db.add_all(tipos)
    return tipos

async def seed_estados_recurso(db: AsyncSession) -> list[EstadoRecurso]:
    estados = [
        EstadoRecurso(id=1, nombre="Pendiente"),
        EstadoRecurso(id=2, nombre="Aprobado"),
        EstadoRecurso(id=3, nombre="Observado"),
        EstadoRecurso(id=4, nombre="Rechazado"),
        EstadoRecurso(id=5, nombre="Archivado"),
    ]
    db.add_all(estados)
    return estados

async def seed_actividades(db: AsyncSession) -> list[TipoActividad]:
    actividades = [
        TipoActividad(id=1, nombre="login"),
        TipoActividad(id=2, nombre="search"),
        TipoActividad(id=3, nombre="download"),
        TipoActividad(id=4, nombre="upload"),
        TipoActividad(id=5, nombre="view"),
        TipoActividad(id=6, nombre="lab_access"),
        TipoActividad(id=7, nombre="resource_approve"),
        TipoActividad(id=8, nombre="resource_archive"),
        TipoActividad(id=9, nombre="upload_rejected"),
        TipoActividad(id=10, nombre="resource_edit"),
    ]
    db.add_all(actividades)
    return actividades

async def seed_niveles(db: AsyncSession) -> list[NivelDificultad]:
    niveles = [
        NivelDificultad(id=1, nombre="Básico"),
        NivelDificultad(id=2, nombre="Intermedio"),
        NivelDificultad(id=3, nombre="Avanzado"),
    ]
    db.add_all(niveles)
    return niveles

async def seed_labs(db: AsyncSession) -> list[ModuloLaboratorio]:
    labs = [
        ModuloLaboratorio(
            id=1,
            titulo="Operaciones Unitarias I",
            descripcion="Balances de materia y energia en columnas de destilacion.",
            url_simulacion="/labs/operaciones-unitarias",
            nivel_id=1,
        ),
        ModuloLaboratorio(
            id=2,
            titulo="Cinética Química",
            descripcion="Velocidad de reaccion y mecanismos con datos experimentales.",
            url_simulacion="/labs/cinetica-quimica",
            nivel_id=2,
        ),
        ModuloLaboratorio(
            id=3,
            titulo="Termodinámica",
            descripcion="Propiedades termodinamicas y equilibrio de fases.",
            url_simulacion="/labs/termodinamica",
            nivel_id=2,
        ),
        ModuloLaboratorio(
            id=4,
            titulo="Reactores Químicos",
            descripcion="Diseno y simulacion de reactores ideales.",
            url_simulacion="/labs/reactores-quimicos",
            nivel_id=3,
        ),
    ]
    db.add_all(labs)
    return labs
