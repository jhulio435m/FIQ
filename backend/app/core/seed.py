import asyncio
import uuid
import os
import boto3
from sqlalchemy import text
from sqlmodel import select, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine, async_session_maker
from app.core.config import settings
from app.models.user import Rol, User
from app.models.resource import TipoRecurso, EstadoRecurso, Curso, Recurso
from app.models.activity import TipoActividad
from app.api.labs.models import NivelDificultad, ModuloLaboratorio
from app.core.security import hash_password


async def seed():
    async with engine.begin() as conn:
        print("Cleaning database (TRUNCATE)...")
        # Truncate all tables to start fresh
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
        
        # Ensure tables exist
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session_maker() as db:
        print("Seeding roles...")
        roles = [
            Rol(id=1, nombre="Admin", descripcion="Administrador del sistema"),
            Rol(id=2, nombre="Docente", descripcion="Docente de la facultad"),
            Rol(id=3, nombre="Estudiante", descripcion="Estudiante de la facultad"),
        ]
        db.add_all(roles)
        await db.flush() # Flush to ensure roles are in DB before users

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

        print("Seeding metadata...")
        tipos = [
            TipoRecurso(id=1, nombre="Libro"),
            TipoRecurso(id=2, nombre="Apunte"),
            TipoRecurso(id=3, nombre="Guía de laboratorio"),
            TipoRecurso(id=4, nombre="Tesis"),
        ]
        db.add_all(tipos)

        estados = [
            EstadoRecurso(id=1, nombre="Pendiente"),
            EstadoRecurso(id=2, nombre="Aprobado"),
            EstadoRecurso(id=3, nombre="Observado"),
            EstadoRecurso(id=4, nombre="Rechazado"),
            EstadoRecurso(id=5, nombre="Archivado"),
        ]
        db.add_all(estados)

        cursos = [
            Curso(id=1, nombre="Química General", codigo="QUI101"),
            Curso(id=2, nombre="Operaciones Unitarias I", codigo="QUI301"),
            Curso(id=3, nombre="Termodinámica", codigo="QUI202"),
        ]
        db.add_all(cursos)

        actividades = [
            TipoActividad(id=1, nombre="login"),
            TipoActividad(id=2, nombre="search"),
            TipoActividad(id=3, nombre="download"),
            TipoActividad(id=4, nombre="upload"),
            TipoActividad(id=5, nombre="view"),
            TipoActividad(id=6, nombre="lab_access"),
            TipoActividad(id=7, nombre="resource_approve"),
        ]
        db.add_all(actividades)

        niveles = [
            NivelDificultad(id=1, nombre="Básico"),
            NivelDificultad(id=2, nombre="Intermedio"),
            NivelDificultad(id=3, nombre="Avanzado"),
        ]
        db.add_all(niveles)
        await db.flush()

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
        await db.commit()

        # Real File Seeding
        print("Uploading real PDF files to S3/MinIO (Async)...")
        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            use_ssl=False,
        )
        try:
            s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        except:
            pass

        seed_files = [
            ("seed_files/guia_estequiometria.pdf", "Guía de Estequiometría", 3, 1),
            ("seed_files/manual_operaciones.pdf", "Manual de Operaciones Unitarias", 2, 2),
        ]

        # Re-fetch admin to avoid detached state
        for path, titulo, t_id, c_id in seed_files:
            if os.path.exists(path):
                key = f"resources/{uuid.uuid4()}_{os.path.basename(path)}"
                with open(path, "rb") as f:
                    s3_client.put_object(
                        Bucket=settings.S3_BUCKET_NAME,
                        Key=key,
                        Body=f,
                        ContentType="application/pdf"
                    )
                
                recurso = Recurso(
                    titulo=titulo,
                    url_archivo=key,
                    archivo_size=os.path.getsize(path),
                    archivo_mime="application/pdf",
                    tipo_recurso_id=t_id,
                    subido_por=admin_id,
                    estado_id=2,
                    curso_id=c_id
                )
                db.add(recurso)

        await db.commit()
        print("Production-grade real seed completed!")


if __name__ == "__main__":
    asyncio.run(seed())
