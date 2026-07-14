# 05. Especificacion de la API

Contrato REST real generado por FastAPI y verificado con `npm run openapi:check`.

## Autenticacion y Seguridad

- Autenticacion principal: Bearer JWT en `Authorization: Bearer <token>`.
- Auth cookie disponible para compatibilidad interna.
- RBAC aplicado en backend: `Admin`, `Docente`, `Estudiante`.
- Los endpoints administrativos responden `401` sin sesion y `403` con rol insuficiente.
- Los errores usan el formato FastAPI `{ "detail": "mensaje" }` o lista `detail` para validacion `422`.

## Catalogo Real de Endpoints

| Metodo | Ruta | Auth | Uso |
| :--- | :--- | :--- | :--- |
| `GET /health` | Publica | Healthcheck de API. |
| `POST /auth/login` | Publica | Login propio con email/password y respuesta JWT + usuario. |
| `POST /auth/logout` | JWT | Logout propio. |
| `POST /auth/jwt/login` | Publica | Login del backend FastAPI Users. |
| `POST /auth/jwt/logout` | JWT | Logout JWT FastAPI Users. |
| `POST /auth/cookie/login` | Publica | Login por cookie. |
| `POST /auth/cookie/logout` | Cookie | Logout cookie. |
| `POST /auth/forgot-password` | Publica | Solicitud de recuperacion. |
| `POST /auth/register` | Publica | Registro FastAPI Users. |
| `GET /auth/microsoft/authorize-url` | Publica | URL de autorizacion Microsoft. |
| `POST /auth/microsoft` | Publica | Login Microsoft con codigo OAuth. |
| `GET /users` | JWT | Lista usuarios. |
| `GET /users/me` | JWT | Perfil actual. |
| `PATCH /users/me` | JWT | Actualiza perfil actual. |
| `GET /users/{id}` | JWT | Usuario por id. |
| `PATCH /users/{id}` | JWT | Actualiza usuario por id. |
| `DELETE /users/{id}` | JWT | Elimina/desactiva usuario segun router FastAPI Users. |
| `PATCH /users/{user_id}/status` | Admin | Activa o desactiva usuario. |
| `PATCH /users/{user_id}/role` | Admin | Cambia rol del usuario. |
| `GET /resources/types` | Publica | Tipos de recurso. |
| `GET /resources/courses` | Publica | Cursos activos para filtros/upload. |
| `GET /resources` | Publica | Recursos aprobados con `search`, `tipo_recurso_id`, `curso_id`, `skip`, `limit`. |
| `POST /resources` | Docente/Admin | Upload multipart seguro de PDF. |
| `POST /resources/init-upload` | Docente/Admin | Inicializa subida directa S3 con metadatos. |
| `POST /resources/import-external` | Docente/Admin | Importa metadatos desde fuentes externas y crea recurso pendiente. |
| `GET /resources/pending` | Admin | Recursos pendientes de moderacion. |
| `PATCH /resources/{resource_id}` | Admin | Actualiza metadatos. |
| `DELETE /resources/{resource_id}` | Admin | Archiva recurso logicamente. |
| `PATCH /resources/{resource_id}/approve` | Admin | Aprueba recurso. |
| `PATCH /resources/{resource_id}/observe` | Admin | Observa recurso con comentario. |
| `POST /resources/{resource_id}/view` | Publica/JWT opcional | Incrementa visualizaciones. |
| `POST /resources/{resource_id}/download` | JWT | Incrementa descargas y devuelve URL interna de archivo. |
| `GET /resources/{resource_id}/url` | Publica | Devuelve URL interna del archivo. |
| `GET /resources/{resource_id}/file` | Publica | Stream del PDF desde object storage. |
| `GET /external/search/books` | Publica | Busca libros en Open Library e Internet Archive. |
| `GET /external/search/articles` | Publica | Busca articulos en Crossref, OpenAlex y Unpaywall si hay email configurado. |
| `GET /labs` | Publica | Modulos de laboratorio, filtro `nivel_id`. |
| `GET /labs/{module_id}` | Publica/JWT opcional | Detalle de modulo y registra `lab_access` si hay usuario. |
| `GET /activity` | Admin | Logs de auditoria con filtros `skip`, `limit`, `usuario_id`, fechas. |
| `GET /activity/events` | Admin | Eventos documentales de auditoria desde MongoDB con filtros `skip`, `limit`, `usuario_id`, `tipo_actividad` y fechas. |
| `GET /reports/most-viewed` | Admin | Recursos mas consultados. |
| `GET /reports/labs-usage` | Admin | Uso agregado de laboratorios. |
| `GET /reports/public/dashboard-data` | API key | Dataset publico controlado para dashboard externo. |
| `GET /reports/public/resources` | API key | Recursos para dashboard externo. |
| `GET /reports/public/courses` | API key | Cursos para dashboard externo. |
| `GET /reports/public/users` | API key | Usuarios para dashboard externo. |
| `GET /reports/public/activities` | API key | Actividades para dashboard externo. |
| `GET /reports/public/document-metrics` | API key | Métricas documentales MongoDB agregadas para Power BI. |

## Payloads Principales

### `POST /auth/login`

Request:

```json
{
  "email": "admin@fiq.uncp.edu.pe",
  "password": "password123"
}
```

Response `200`:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "usuario": {
    "id": "uuid",
    "nombre": "Admin FIQ",
    "email": "admin@fiq.uncp.edu.pe",
    "rol": "Admin"
  }
}
```

Errores esperados: `401` credenciales invalidas, `422` payload invalido.

### `GET /resources`

Query params:

| Parametro | Tipo | Descripcion |
| :--- | :--- | :--- |
| `search` | string | Busca en titulo/resumen. |
| `tipo_recurso_id` | int | Filtra por tipo. |
| `curso_id` | int | Filtra por curso. |
| `skip` | int | Offset, default `0`. |
| `limit` | int | Limite, default `20`. |

Response `200`: lista de `RecursoRead` con metadatos bibliograficos, curso/tipo calculados, contadores y fechas.

### `POST /resources`

Request `multipart/form-data`:

| Campo | Tipo | Regla |
| :--- | :--- | :--- |
| `file` | PDF | Obligatorio, `application/pdf` o `application/x-pdf`, extension unica `.pdf`, magic number `%PDF`, marcador `%%EOF`, max `MAX_UPLOAD_SIZE`. |
| `titulo` | string | Obligatorio. |
| `resumen` | string | Opcional. |
| `tipo_recurso_id` | int | Obligatorio. |
| `curso_id` | int | Opcional. |
| `autores` | string | Opcional. |
| `editorial` | string | Opcional. |
| `doi` | string | Opcional. |
| `anio` | int | Opcional. |

Response `201`: recurso creado en estado `Pendiente`.

Errores esperados:

| Codigo | Caso |
| :--- | :--- |
| `401` | Sin token. |
| `403` | Rol sin permiso. |
| `413` | Archivo excede limite. |
| `415` | MIME, extension o magic number no permitido. |
| `422` | Archivo vacio, PDF incompleto, nombre peligroso o formulario invalido. |
| `500` | Object storage no disponible. |

La API genera la clave de almacenamiento en servidor y registra `upload` o `upload_rejected` cuando existe el tipo de actividad.

### `POST /resources/init-upload`

Request JSON: metadatos de recurso mas `file_name`, `file_mime`, `file_size`.

Validaciones: tamano positivo, maximo configurado, MIME PDF y extension `.pdf`. No valida magic number porque el binario se sube directo a S3.

### `GET /external/search/books`

Query params:

| Parametro | Tipo | Descripcion |
| :--- | :--- | :--- |
| `q` | string | Texto de busqueda, minimo 2 caracteres. |
| `isbn` | string | ISBN opcional para busqueda dirigida en Open Library. |
| `limit` | int | Resultados por proveedor, `1..20`, default `8`. |

Response `200`:

```json
{
  "results": [
    {
      "source": "open_library",
      "external_id": "OL123W",
      "resource_type": "book",
      "title": "Termodinamica aplicada",
      "authors": ["Autor"],
      "publisher": "Editorial",
      "published_year": 2025,
      "isbn": "9781234567890",
      "cover_url": "https://covers.openlibrary.org/b/isbn/9781234567890-M.jpg",
      "external_url": "https://openlibrary.org/works/OL123W"
    }
  ],
  "warnings": []
}
```

Fuentes: Open Library Search/Covers e Internet Archive Advanced Search. Si un proveedor falla, la respuesta conserva resultados de otros proveedores y agrega un warning sin exponer trazas internas.

### `GET /external/search/articles`

Query params:

| Parametro | Tipo | Descripcion |
| :--- | :--- | :--- |
| `q` | string | Titulo, autor o palabras clave. |
| `doi` | string | DOI para busqueda exacta. |
| `limit` | int | Resultados por proveedor, `1..20`, default `8`. |

Fuentes: Crossref, OpenAlex y Unpaywall. Unpaywall requiere `EXTERNAL_API_EMAIL`; si no existe, devuelve warning y no bloquea Crossref/OpenAlex.

Cuando `MONGO_ENABLED=true`, las busquedas externas usan cache documental MongoDB en `external_catalog_cache`. La llave se calcula con el tipo de busqueda y parametros normalizados; en cache hit la respuesta conserva el mismo contrato e incluye una advertencia informativa de cache.

### `POST /resources/import-external`

Request JSON:

| Campo | Tipo | Regla |
| :--- | :--- | :--- |
| `source` | string | Fuente externa, por ejemplo `crossref` u `open_library`. |
| `external_id` | string | Identificador original. |
| `titulo` | string | Titulo a registrar. |
| `tipo_recurso_id` | int | Tipo local asignado. |
| `resumen` | string | Opcional. |
| `curso_id` | int | Opcional. |
| `autores` | string | Opcional. |
| `editorial` | string | Opcional. |
| `doi` | string | Opcional; si ya existe responde `409`. |
| `anio` | int | Opcional. |
| `external_url` | string | URL legal de referencia. |
| `open_access_url` | string | URL open access legal si existe. |
| `cover_url` | string | URL de portada si existe. |

Response `201`: crea un recurso en estado `Pendiente`, con `archivo_mime="text/html"` y `url_archivo` apuntando a `open_access_url` o `external_url`. No descarga ni almacena archivos externos automaticamente.

Errores esperados: `401`, `403`, `409`, `422`.

### Moderacion de Recursos

- `PATCH /resources/{resource_id}/approve`: body opcional `{ "comentario": "texto" }`.
- `PATCH /resources/{resource_id}/observe`: body requerido `{ "comentario": "texto" }`.
- `DELETE /resources/{resource_id}`: body opcional `{ "comentario": "texto" }`.

Codigos comunes: `200`, `401`, `403`, `404`, `422`.

## Auditoria

Eventos esperados:

| Evento | Origen |
| :--- | :--- |
| `login` | Login exitoso. |
| `upload` | Upload aceptado o metadatos de direct upload creados. |
| `upload_rejected` | Upload rechazado por validacion backend. |
| `view` | Vista de recurso con usuario autenticado. |
| `download` | Descarga solicitada. |
| `lab_access` | Acceso autenticado a modulo de laboratorio. |
| `resource_approve` | Aprobacion administrativa. |
| `resource_archive` | Archivado administrativo. |

Campos registrados: usuario, tipo, fecha/hora, IP, user agent y detalle JSON con recurso, resultado o motivo.

`GET /activity/events` consulta la colección MongoDB `activity_events` cuando `MONGO_ENABLED=true`. Devuelve documentos enriquecidos con `sql_activity_id`, `usuario_id`, `tipo_actividad`, `occurred_at`, IP, user agent y `detalle_accion`. Si MongoDB no está configurado, responde `503`.

## Power BI

Los endpoints `/reports/public/*` usan `DASHBOARD_API_KEY`. `GET /reports/public/document-metrics` devuelve agregados de MongoDB para `activity_events` y `external_catalog_cache`; si MongoDB no está inicializado, responde con `mongo_enabled=false` y colecciones vacías para que Power BI mantenga un esquema estable.

## Verificacion

Ejecutar:

```bash
npm run openapi:check
```

El script importa la app FastAPI, normaliza rutas con parametros y falla si un endpoint real no esta documentado o si el documento conserva rutas inexistentes.
