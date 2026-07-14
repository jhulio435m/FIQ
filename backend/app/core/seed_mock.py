import asyncio
import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlmodel import select, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine, async_session_maker
from app.models.user import Rol, User
from app.models.resource import TipoRecurso, EstadoRecurso, Curso, Recurso
from app.models.activity import RegistroActividad, TipoActividad
from app.api.labs.models import NivelDificultad, ModuloLaboratorio
from app.core.security import hash_password

# Listas de datos simulados para realismo
NOMBRES_DOCENTES = [
    "Dr. Hugo Alarcón", "Dra. Elisa Vargas", "MSc. Julio Mendoza", 
    "Ing. Walter Sánchez", "Dr. Carlos Rojas", "Dra. Patricia Ortiz",
    "Ing. Liliana Flores", "MSc. Daniel Quispe", "Dra. Sofía Medina"
]

NOMBRES_ESTUDIANTES = [
    "Juan Pérez", "María Condori", "José Lázaro", "Ana Ramos", "Luis Torres",
    "Gabriela Soto", "Carlos Díaz", "Diana Solano", "Kevin Aguilar", "Ruth Castillo",
    "Jorge Pinedo", "Andrea Salazar", "Franklin Ramos", "Milagros Carhuas", "Christian Paucar",
    "Alex Vílchez", "Flor Espinoza", "Renato Palomino", "Lucía Camargo", "Samuel Herrera"
]

CURSOS = [
    ("Química General", "QUI101", 1),
    ("Química Orgánica I", "QUI102", 2),
    ("Fisicoquímica I", "QUI201", 3),
    ("Termodinámica", "QUI202", 4),
    ("Fenómenos de Transporte", "QUI302", 5),
    ("Operaciones Unitarias I", "QUI301", 6),
    ("Cinética Química y Reactores", "QUI401", 7),
    ("Control de Procesos Químicos", "QUI402", 8),
    ("Diseño de Plantas Químicas", "QUI501", 9),
    ("Simulación de Procesos", "QUI502", 10)
]

TITULOS_RECURSOS = [
    # Libros
    ("Libro: Fundamentos de Termodinámica de Ingeniería Química", 1),
    ("Libro: Operaciones de Transferencia de Masa - Treybal", 1),
    ("Libro: Ingeniería de las Reacciones Químicas - Levenspiel", 1),
    ("Libro: Principios Elementales de los Procesos Químicos - Felder", 1),
    ("Libro: Fisicoquímica - Ira Levine Vol. 1", 1),
    # Apuntes
    ("Apuntes de Fenómenos de Transporte - Semana 1 a 8", 2),
    ("Formulario Completo de Balances de Materia y Energía", 2),
    ("Diapositivas: Diseño de Reactores Heterogéneos", 2),
    ("Ejercicios Resueltos: Destilación Multicomponente", 2),
    ("Guía de Estudio: Métodos Numéricos aplicados a Ing. Química", 2),
    # Guías de laboratorio
    ("Guía Lab 1: Determinación de la Viscosidad de Fluidos", 3),
    ("Guía Lab 2: Equilibrio Líquido-Vapor en Sistemas Binarios", 3),
    ("Guía Lab 3: Cinética de Saponificación de Acetato de Etilo", 3),
    ("Guía Lab 4: Eficiencia de Intercambiador de Calor de Tubos", 3),
    ("Guía Lab 5: Pérdidas por Fricción en Tuberías y Accesorios", 3),
    # Tesis
    ("Tesis: Modelamiento y Control de un Evaporador de Efecto Múltiple", 4),
    ("Tesis: Tratamiento de Efluentes Mineros usando Humedales Artificiales", 4),
    ("Tesis: Optimización Energética de una Columna de Destilación Reactiva", 4),
    ("Tesis: Producción de Biodiésel a partir de Aceite de Cocina Usado", 4),
    ("Tesis: Diseño y Simulación de un Reactor de Lecho Fluidizado", 4)
]

AUTORES = [
    "Octave Levenspiel", "Robert E. Treybal", "Richard Felder", "J.M. Smith", 
    "Levine", "Perry & Green", "McCabe & Smith", "Fogler"
]

async def seed_mock():
    # 1. Truncar y limpiar clúster
    async with engine.begin() as conn:
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

    async with async_session_maker() as db:
        # 2. Roles
        print("Seeding roles...")
        roles = [
            Rol(id=1, nombre="Admin", descripcion="Administrador del sistema"),
            Rol(id=2, nombre="Docente", descripcion="Docente de la facultad"),
            Rol(id=3, nombre="Estudiante", descripcion="Estudiante de la facultad"),
        ]
        db.add_all(roles)
        await db.flush()

        # 3. Administrador
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

        # 4. Docentes
        print("Seeding docents...")
        docentes_db = []
        for i, nombre in enumerate(NOMBRES_DOCENTES):
            doc_id = uuid.uuid4()
            email = f"docente{i+1}@fiq.uncp.edu.pe"
            docente = User(
                id=doc_id,
                email=email,
                hashed_password=hash_password("docente123"),
                nombre=nombre,
                rol_id=2,
                is_active=True,
                is_superuser=False,
                is_verified=True
            )
            db.add(docente)
            docentes_db.append(docente)
        await db.flush()

        # 5. Estudiantes
        print("Seeding students...")
        estudiantes_db = []
        for i, nombre in enumerate(NOMBRES_ESTUDIANTES):
            est_id = uuid.uuid4()
            email = f"estudiante{i+1}@fiq.uncp.edu.pe"
            estudiante = User(
                id=est_id,
                email=email,
                hashed_password=hash_password("estudiante123"),
                nombre=nombre,
                rol_id=3,
                is_active=True,
                is_superuser=False,
                is_verified=True
            )
            db.add(estudiante)
            estudiantes_db.append(estudiante)
        await db.flush()

        # 6. Metadata General
        print("Seeding metadata (types, states, courses)...")
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

        cursos_db = []
        for nombre, codigo, ciclo in CURSOS:
            curso = Curso(nombre=nombre, codigo=codigo, ciclo=ciclo)
            db.add(curso)
            cursos_db.append(curso)
        await db.flush()

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
        ]
        db.add_all(actividades)

        niveles = [
            NivelDificultad(id=1, nombre="Básico"),
            NivelDificultad(id=2, nombre="Intermedio"),
            NivelDificultad(id=3, nombre="Avanzado"),
        ]
        db.add_all(niveles)
        await db.flush()

        # 7. Modulos laboratorio
        labs = [
            ModuloLaboratorio(id=1, titulo="Operaciones Unitarias I", descripcion="Destilación", url_simulacion="/labs/operaciones-unitarias", nivel_id=1),
            ModuloLaboratorio(id=2, titulo="Cinética Química", descripcion="Reactores batch", url_simulacion="/labs/cinetica-quimica", nivel_id=2),
            ModuloLaboratorio(id=3, titulo="Termodinámica", descripcion="Equilibrio líquido-vapor", url_simulacion="/labs/termodinamica", nivel_id=2),
            ModuloLaboratorio(id=4, titulo="Reactores Químicos", descripcion="Reactores CSTR", url_simulacion="/labs/reactores-quimicos", nivel_id=3)
        ]
        db.add_all(labs)
        await db.flush()

        # 8. Recursos Simulación (50 recursos para buen volumen)
        print("Seeding resources...")
        recursos_db = []
        for i in range(50):
            # Seleccionar un docente aleatorio
            docente = random.choice(docentes_db)
            curso = random.choice(cursos_db)
            titulo_base, tipo_id = random.choice(TITULOS_RECURSOS)
            
            titulo = f"{titulo_base} (Ref. {i+1})"
            autores = random.choice(AUTORES) if tipo_id == 1 else docente.nombre
            anio = random.randint(2015, 2026)
            
            # Fechas aleatorias de creación en los últimos 30 días
            random_days_ago = random.randint(0, 30)
            created_at = datetime.now() - timedelta(days=random_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            recurso = Recurso(
                titulo=titulo,
                url_archivo=f"resources/mock_file_{i+1}.pdf",
                archivo_size=random.randint(500000, 15000000), # 0.5MB - 15MB
                archivo_mime="application/pdf",
                tipo_recurso_id=tipo_id,
                subido_por=docente.id,
                estado_id=random.choices([2, 1, 3], weights=[80, 15, 5])[0], # 80% aprobados, 15% pendientes, 5% observados
                curso_id=curso.id,
                visualizaciones=random.randint(10, 500),
                descargas=random.randint(5, 250),
                autores=autores,
                anio=anio,
                created_at=created_at,
                updated_at=created_at
            )
            db.add(recurso)
            recursos_db.append(recurso)
        await db.flush()

        # 9. Actividades (500 registros para ver hermosas gráficas históricas de visitas)
        print("Seeding activities...")
        todos_usuarios = [admin] + docentes_db + estudiantes_db
        
        for _ in range(500):
            usuario = random.choice(todos_usuarios)
            tipo_act_id = random.choices([1, 2, 3, 5, 6], weights=[20, 25, 20, 25, 10])[0] # login, search, download, view, lab_access
            
            recurso_rel = None
            if tipo_act_id in [3, 5]: # download o view requiere recurso
                recurso_rel = random.choice(recursos_db)
            
            random_days_ago = random.randint(0, 30)
            fecha_hora = datetime.now() - timedelta(days=random_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            # entidad_relacionada_id is a UUID in the DB, so we generate a deterministic UUID from the resource's integer ID
            recurso_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"resource_{recurso_rel.id}") if recurso_rel else None

            registro = RegistroActividad(
                usuario_id=usuario.id,
                tipo_actividad_id=tipo_act_id,
                entidad_relacionada_id=recurso_uuid,
                fecha_hora=fecha_hora,
                ip_origen=f"190.235.{random.randint(1, 254)}.{random.randint(1, 254)}",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                detalle_accion={"mock": True}
            )
            db.add(registro)
            
        await db.commit()
        print("Successfully seeded 50 mock resources, 500 activities, 29 mock users and 10 courses!")

if __name__ == "__main__":
    asyncio.run(seed_mock())
