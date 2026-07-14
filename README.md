# FIQ Plataforma Digital - UNCP

Biblioteca virtual y plataforma academica para la Facultad de Ingenieria Quimica UNCP. Incluye autenticacion con roles, catalogo de recursos, uploads PDF seguros, moderacion administrativa, auditoria, reportes y laboratorios educativos interactivos.

## Stack

- Backend: FastAPI, SQLModel/SQLAlchemy, PostgreSQL, MongoDB, Redis, MinIO/S3, Alembic, UV.
- Frontend: React 19, TypeScript 6, Vite 8, Tailwind v4, shadcn/ui, TanStack Query, Zustand.
- Testing: Pytest, Vitest + React Testing Library + MSW, Playwright.
- Infra local: Docker Compose.

## Requisitos

- Python 3.12+
- UV
- Node.js 22+
- Docker y Docker Compose

## Variables de entorno

Usar `backend/.env.example` como base. No subir `.env`, `.env.prod`, llaves privadas, WireGuard ni claves S3 reales. El repo ignora esos archivos por defecto.

Variables principales:

- `DATABASE_URL`
- `REDIS_URL`
- `MONGO_ENABLED`
- `MONGO_URL`
- `MONGO_DB_NAME`
- `MONGO_ACTIVITY_COLLECTION`
- `MONGO_EXTERNAL_CACHE_COLLECTION`
- `SECRET_KEY`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET_NAME`
- `CORS_ORIGINS`
- `MAX_UPLOAD_SIZE`
- `DASHBOARD_API_KEY` para endpoints `/reports/public/*`
- `EXTERNAL_API_EMAIL` para uso identificado de OpenAlex/Crossref y habilitar Unpaywall.
- `EXTERNAL_API_USER_AGENT` para identificar la plataforma ante APIs bibliograficas abiertas.
- `EXTERNAL_CACHE_TTL_SECONDS` para controlar la vida util del cache Mongo de catalogo externo.

## Desarrollo local

Infraestructura:

```bash
docker compose up -d postgres redis minio
```

Para probar la arquitectura de doble base de datos:

```bash
docker compose up -d postgres mongo redis minio
```

Backend:

```bash
cd backend
uv run alembic upgrade head
uv run python -m app.core.seed
uv run uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Testing y calidad

Backend:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm run test:unit
npx playwright test
```

OpenAPI:

```bash
npm run openapi:check
```

Docker:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
docker compose down
```

## Roles de prueba

Seed principal:

- Admin: `admin@fiq.uncp.edu.pe` / `admin123`

Permisos resumidos:

- Admin: usuarios, moderacion, reportes, auditoria, recursos.
- Docente: subir recursos y consultar biblioteca/laboratorios.
- Estudiante: consultar biblioteca/laboratorios y descargar con sesion.

## Flujo de uploads

`POST /resources` recibe `multipart/form-data`, exige PDF real y crea el recurso en estado `Pendiente`. Validaciones backend:

- MIME permitido: `application/pdf` o `application/x-pdf`.
- Extension unica `.pdf`.
- Nombre sin traversal.
- Magic number `%PDF`.
- Marcador final `%%EOF`.
- Tamano maximo `MAX_UPLOAD_SIZE`.
- Clave de almacenamiento generada por servidor.
- Auditoria `upload` o `upload_rejected`.

## Doble base de datos

PostgreSQL sigue siendo la fuente transaccional para usuarios, roles, cursos, recursos, estados, moderacion y reportes relacionales. MongoDB se usa solo para datos documentales que cambian de forma con frecuencia: eventos de auditoria enriquecidos en `activity_events` y cache de catalogo externo en `external_catalog_cache`.

Cada llamada a `log_activity` mantiene el registro SQL en `registro_actividades` y, si `MONGO_ENABLED=true`, emite un documento Mongo con `detalle_accion`, IP, user agent, usuario, tipo, fecha y referencia al registro SQL. Si MongoDB no esta configurado, la operacion principal continua usando PostgreSQL.

Las busquedas `GET /external/search/books` y `GET /external/search/articles` consultan primero `external_catalog_cache`. Si no hay entrada vigente, llaman a los proveedores externos, normalizan el resultado y guardan el documento con expiracion TTL. Esto reduce latencia, evita repetir llamadas y conserva snapshots temporales de metadatos bibliograficos.

## Integraciones bibliograficas externas

El backend expone endpoints propios y no llama APIs externas desde React:

- `GET /external/search/books`: Open Library + Internet Archive.
- `GET /external/search/articles`: Crossref + OpenAlex + Unpaywall.
- `POST /resources/import-external`: convierte un resultado externo en recurso interno pendiente.

Los resultados externos se normalizan a metadatos comunes: titulo, autores, editorial/revista, anio, ISBN/DOI, portada, URL externa y URL open access cuando aplica. Unpaywall requiere `EXTERNAL_API_EMAIL`; si falta, la API devuelve un warning y conserva los resultados de Crossref/OpenAlex.

## Troubleshooting

- Si `pytest` global no existe, usar `uv run --extra dev pytest`.
- Si UV no puede escribir cache fuera del sandbox, usar `UV_CACHE_DIR=/tmp/fiq-uv-cache`.
- En Arch, `npx playwright install --with-deps` intenta usar `apt-get`; usar `npx playwright install` y resolver dependencias del sistema con el gestor de paquetes local.
- Si Docker Compose queda esperando frontend, revisar primero `backend` healthcheck y logs de Postgres/MinIO.

## Documentacion

- [API](./docs/05_especificacion_api.md)
- [Plan HA, Kubernetes/Swarm y Power BI](./docs/14_plan_ha_kubernetes_swarm_powerbi.md)
- [Seguridad de uploads](./docs/09_seguridad_uploads.md)
- [Roles y permisos](./docs/10_roles_permisos.md)
- [Pruebas](./docs/11_pruebas.md)
- [Laboratorios](./docs/12_laboratorios.md)
- [Integraciones externas](./docs/13_integraciones_externas.md)
