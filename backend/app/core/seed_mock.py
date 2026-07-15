import asyncio
import uuid
import random
from datetime import datetime, timedelta, timezone

from app.core.database import engine, async_session_maker
from app.models.user import User
from app.models.resource import Curso, Recurso
from app.models.activity import RegistroActividad
from app.core.security import hash_password
from app.core.seed_base import truncate_all, seed_roles, seed_admin, seed_tipos_recurso, seed_estados_recurso, seed_actividades, seed_niveles, seed_labs

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
    ("Libro: Fundamentos de Termodinámica de Ingeniería Química", 1),
    ("Libro: Operaciones de Transferencia de Masa - Treybal", 1),
    ("Libro: Ingeniería de las Reacciones Químicas - Levenspiel", 1),
    ("Libro: Principios Elementales de los Procesos Químicos - Felder", 1),
    ("Libro: Fisicoquímica - Ira Levine Vol. 1", 1),
    ("Apuntes de Fenómenos de Transporte - Semana 1 a 8", 2),
    ("Formulario Completo de Balances de Materia y Energía", 2),
    ("Diapositivas: Diseño de Reactores Heterogéneos", 2),
    ("Ejercicios Resueltos: Destilación Multicomponente", 2),
    ("Guía de Estudio: Métodos Numéricos aplicados a Ing. Química", 2),
    ("Guía Lab 1: Determinación de la Viscosidad de Fluidos", 3),
    ("Guía Lab 2: Equilibrio Líquido-Vapor en Sistemas Binarios", 3),
    ("Guía Lab 3: Cinética de Saponificación de Acetato de Etilo", 3),
    ("Guía Lab 4: Eficiencia de Intercambiador de Calor de Tubos", 3),
    ("Guía Lab 5: Pérdidas por Fricción en Tuberías y Accesorios", 3),
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
    async with engine.begin() as conn:
        await truncate_all(conn)

    async with async_session_maker() as db:
        await seed_roles(db)
        admin_id, admin = await seed_admin(db)

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

        print("Seeding metadata (types, states, courses)...")
        await seed_tipos_recurso(db)
        await seed_estados_recurso(db)

        cursos_db = []
        for nombre, codigo, ciclo in CURSOS:
            curso = Curso(nombre=nombre, codigo=codigo, ciclo=ciclo)
            db.add(curso)
            cursos_db.append(curso)
        await db.flush()

        await seed_actividades(db)
        await seed_niveles(db)
        await db.flush()

        await seed_labs(db)
        await db.flush()

        print("Seeding resources...")
        recursos_db = []
        for i in range(50):
            docente = random.choice(docentes_db)
            curso = random.choice(cursos_db)
            titulo_base, tipo_id = random.choice(TITULOS_RECURSOS)
            
            titulo = f"{titulo_base} (Ref. {i+1})"
            autores = random.choice(AUTORES) if tipo_id == 1 else docente.nombre
            anio = random.randint(2015, 2026)
            
            random_days_ago = random.randint(0, 30)
            created_at = datetime.now() - timedelta(days=random_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            recurso = Recurso(
                titulo=titulo,
                url_archivo=f"resources/mock_file_{i+1}.pdf",
                archivo_size=random.randint(500000, 15000000),
                archivo_mime="application/pdf",
                tipo_recurso_id=tipo_id,
                subido_por=docente.id,
                estado_id=random.choices([2, 1, 3], weights=[80, 15, 5])[0],
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

        print("Seeding activities...")
        todos_usuarios = [admin] + docentes_db + estudiantes_db
        
        for _ in range(500):
            usuario = random.choice(todos_usuarios)
            tipo_act_id = random.choices([1, 2, 3, 5, 6], weights=[20, 25, 20, 25, 10])[0]
            
            recurso_rel = None
            if tipo_act_id in [3, 5]:
                recurso_rel = random.choice(recursos_db)
            
            random_days_ago = random.randint(0, 30)
            fecha_hora = datetime.now() - timedelta(days=random_days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
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
