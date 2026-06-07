# FIQ Plataforma Digital - UNCP (V1.0 Release Candidate)

Plataforma integral para la Facultad de Ingeniería Química - UNCP. Gestión de recursos académicos, laboratorios virtuales y auditoría avanzada.

## 🚀 Estado del Proyecto
El sistema es **100% funcional** y utiliza tecnologías de vanguardia para garantizar seguridad y escalabilidad.

### Funcionalidades Core Implementadas:
- **Autenticación & RBAC:** Login con JWT, roles de Admin, Docente y Estudiante.
- **Gestión de Perfil:** Los usuarios pueden actualizar sus datos y contraseñas.
- **Biblioteca Virtual:** Buscador avanzado con filtros por tipo y curso.
- **Carga de Archivos Real:** Sistema de subida de PDFs directo a MinIO/S3 con validación.
- **Descargas Seguras:** Entrega de binarios mediante streams protegidos por JWT.
- **Panel Administrativo:** Control total de usuarios, roles y aprobación de recursos.
- **Auditoría:** Registro automático de actividades críticas (logs).

## 🏗️ Arquitectura Técnica
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0, PostgreSQL 17, Redis 7.
- **Almacenamiento:** MinIO (S3 compatible) para binarios reales.
- **Frontend:** React 19, Vite 6, Tailwind CSS v4, shadcn/ui.
- **Infraestructura:** Docker Compose para orquestación local y soporte para K8s.

## 🛠️ Guía de Inicio Rápido (Modo Híbrido/Dev)

### 1. Requisitos
- Docker y Docker Compose.
- Python 3.12+
- Node.js 22+

### 2. Levantar Infraestructura
```bash
docker-compose up -d postgres redis minio
```

### 3. Configurar y Ejecutar Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m app.core.seed # Carga datos y archivos REALES
uvicorn app.main:app --reload
```

### 4. Ejecutar Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Credenciales por Defecto (Seed)
- **Admin:** `admin@fiq.uncp.edu.pe` / `admin123`

## 📖 Documentación Detallada
Consultar la carpeta [`docs/`](./docs/) para especificaciones profundas:
- [Contexto del Proyecto](./docs/01_contexto_proyecto.md)
- [Gestión Ágil](./docs/02_gestion_agil.md)
- [Arquitectura de Software](./docs/03_arquitectura_software.md)
- [Modelo de Datos](./docs/04_modelo_datos.md)
- [Especificación API](./docs/05_especificacion_api.md)
- [Seguridad Zero Trust](./docs/06_seguridad_zero_trust.md)
