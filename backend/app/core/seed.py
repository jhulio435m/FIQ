import asyncio
import uuid
import os
import logging
from sqlmodel import SQLModel

from app.core.database import engine, async_session_maker
from app.core.config import settings
from app.models.resource import Curso, Recurso
from app.core.seed_base import truncate_all, seed_roles, seed_admin, seed_tipos_recurso, seed_estados_recurso, seed_actividades, seed_niveles, seed_labs
from app.core.s3 import s3_service

logger = logging.getLogger(__name__)

async def seed():
    async with engine.begin() as conn:
        await truncate_all(conn)

    async with async_session_maker() as db:
        await seed_roles(db)
        admin_id, admin = await seed_admin(db)
        
        print("Seeding metadata...")
        await seed_tipos_recurso(db)
        await seed_estados_recurso(db)

        cursos = [
            Curso(id=1, nombre="Química General", codigo="QUI101"),
            Curso(id=2, nombre="Operaciones Unitarias I", codigo="QUI301"),
            Curso(id=3, nombre="Termodinámica", codigo="QUI202"),
        ]
        db.add_all(cursos)
        
        await seed_actividades(db)
        await seed_niveles(db)
        await db.flush()

        await seed_labs(db)
        await db.commit()

        # Real File Seeding
        logger.info("Uploading real PDF files to S3/MinIO (Async)...")
        async with s3_service.session.client(**s3_service.config) as s3:
            try:
                await s3.create_bucket(Bucket=settings.S3_BUCKET_NAME)
            except Exception as e:
                logger.warning(f"Bucket creation skipped: {e}")
                
            existing_objects = await s3.list_objects_v2(Bucket=settings.S3_BUCKET_NAME)
            if "Contents" in existing_objects:
                await s3.delete_objects(
                    Bucket=settings.S3_BUCKET_NAME,
                    Delete={
                        "Objects": [
                            {"Key": item["Key"]} for item in existing_objects["Contents"]
                        ]
                    },
                )

            seed_files = [
                ("seed_files/documento_de_prueba.pdf", "Documento de prueba", 1, 1),
            ]

            # Re-fetch admin to avoid detached state
            for path, titulo, t_id, c_id in seed_files:
                if os.path.exists(path):
                    key = f"resources/{uuid.uuid4()}_{os.path.basename(path)}"
                    with open(path, "rb") as f:
                        body = f.read()
                    await s3.put_object(
                        Bucket=settings.S3_BUCKET_NAME,
                        Key=key,
                        Body=body,
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
        logger.info("Production-grade real seed completed!")

if __name__ == "__main__":
    asyncio.run(seed())
