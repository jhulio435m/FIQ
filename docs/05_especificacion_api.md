# 05. Especificacion de la API

Contrato REST real generado por FastAPI y verificado con `npm run openapi:check`.

## Autenticacion y Seguridad

- Autenticacion principal: Bearer JWT en `Authorization: Bearer <token>`.
- Auth cookie disponible para compatibilidad interna.
- El refresh se entrega exclusivamente como cookie `fiq_refresh` HttpOnly/Secure/SameSite=Strict; el access token vive en memoria del navegador. `/auth/refresh` y `/auth/logout` requieren `X-Requested-With: FIQ` y un origen permitido. Logout revoca todas las sesiones del usuario; reutilizar un refresh consumido también las revoca.
- Registro y perfil propio no aceptan `rol_id` ni `esta_activo`; los cambios de rol y estado utilizan las rutas administrativas.
- Microsoft usa state vinculado a cookie HttpOnly, PKCE S256 y una única redirección permitida: `FRONTEND_URL/login`.
- RBAC aplicado en backend: `Admin`, `Docente`, `Estudiante`.
- Los endpoints administrativos responden `401` sin sesion y `403` con rol insuficiente.
- Los errores usan el formato FastAPI `{ "detail": "mensaje" }` o lista `detail` para validacion `422`.

## Catalogo Real de Endpoints

| Metodo | Ruta | Auth | Uso |
| :--- | :--- | :--- | :--- |
| `GET /health` | Publica | Healthcheck de API. |
| `POST /auth/login` | Publica | Login propio con email/password y respuesta JWT + usuario. |
| `POST /auth/refresh` | Publica con refresh token | Rota el refresh token y devuelve un nuevo access token. |
| `POST /auth/logout` | JWT | Logout propio. |
| `POST /auth/jwt/login` | Publica | Login del backend FastAPI Users. |
| `POST /auth/jwt/logout` | JWT | Logout JWT FastAPI Users. |
| `POST /auth/cookie/login` | Publica | Login por cookie. |
| `POST /auth/cookie/logout` | Cookie | Logout cookie. |
| `POST /auth/forgot-password` | Publica | Solicitud de recuperacion. |
| `POST /auth/reset-password` | Publica con token | Confirma una nueva contraseña con el token de recuperación. |
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
| `GET /resources/catalog` | Publica | Catálogo paginado con total, orden global y filtros. |
| `GET /resources/{resource_id}` | Publica | Ficha permanente de un recurso aprobado. |
| `POST /resources` | Docente/Admin | Upload multipart seguro de PDF. |
| `POST /resources/init-upload` | Docente/Admin | Inicializa subida directa S3 con metadatos. |
| `POST /resources/{resource_id}/complete-upload` | Docente propietario/Admin | Valida PDF y antivirus tras carga directa; rechaza o envía a cuarentena archivos inválidos. |
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
| `GET /resources/featured` | Publica | Carruseles de recursos destacados (recientes, más vistos, más descargados). |
| `GET /resources/{resource_id}/related` | Publica | Recursos relacionados recomendados por curso, tema o tipo. |
| `GET /resources/{resource_id}/reviews` | Publica | Lista de valoraciones y promedio de estrellas del recurso. |
| `POST /resources/{resource_id}/reviews` | JWT | Califica (1-5 estrellas) y opcionalmente comenta un recurso. |
| `DELETE /resources/{resource_id}/reviews/me` | JWT | Elimina la valoración personal del recurso. |
| `POST /resources/{resource_id}/reports` | JWT | Reporta un problema en un recurso (corrupto, duplicado, metadatos). |
| `GET /resources/reports/pending` | Admin | Lista incidencias y reportes pendientes de revisión. |
| `PATCH /resources/reports/{report_id}` | Admin | Actualiza estado y resolución de un reporte de incidencia. |
| `GET /works/by-resource/{resource_id}` | Publica | Obra, ediciones y archivos aprobados vinculados a un recurso. |
| `GET /works/{work_id}` | Publica | Ficha bibliográfica de una obra con sus ediciones y formatos públicos. |
| `POST /works/resources/{resource_id}/sync` | Admin | Vincula de forma idempotente un recurso legado con obra, edición y archivo. |
| `POST /works/{target_work_id}/merge/{source_work_id}` | Admin | Fusiona dos obras y mueve las ediciones de la obra origen. |
| `GET /external/search/books` | Publica | Busca libros en Open Library e Internet Archive. |
| `GET /external/search/articles` | Publica | Busca articulos en Crossref, OpenAlex y Unpaywall si hay email configurado. |
| `GET /library/me/resources` | JWT | Recursos personales del usuario, con filtros de favorito y estado. |
| `GET /library/me/resources/{resource_id}` | JWT | Estado personal de un recurso o `null` si aún no fue guardado. |
| `PUT /library/me/resources/{resource_id}` | JWT | Guarda favorito, estado de lectura y página actual. |
| `DELETE /library/me/resources/{resource_id}` | JWT | Quita el recurso de la biblioteca personal. |
| `GET /library/me/lists` | JWT | Listas propias privadas y públicas. |
| `POST /library/me/lists` | JWT | Crea una lista, privada por defecto. |
| `GET /library/me/lists/{list_id}` | JWT propietario | Detalle de una lista propia. |
| `PATCH /library/me/lists/{list_id}` | JWT propietario | Edita nombre, descripción o visibilidad. |
| `DELETE /library/me/lists/{list_id}` | JWT propietario | Elimina una lista propia. |
| `POST /library/me/lists/{list_id}/resources/{resource_id}` | JWT propietario | Añade un recurso aprobado a una lista. |
| `DELETE /library/me/lists/{list_id}/resources/{resource_id}` | JWT propietario | Quita un recurso de una lista. |
| `GET /library/lists/{list_id}` | Pública/JWT propietario | Consulta una lista compartida o su propia lista privada. |
| `GET /library/me/history` | JWT | Historial privado de consultas y descargas. |
| `DELETE /library/me/history` | JWT | Borra únicamente el historial bibliográfico propio. |
| `GET /library/me/resources/{resource_id}/bookmarks` | JWT | Lista de marcadores y notas personales para un recurso. |
| `POST /library/me/resources/{resource_id}/bookmarks` | JWT | Crea un marcador o nota personal de lectura (página, título, contenido, color). |
| `PATCH /library/me/bookmarks/{bookmark_id}` | JWT propietario | Actualiza el contenido o color de un marcador. |
| `DELETE /library/me/bookmarks/{bookmark_id}` | JWT propietario | Elimina un marcador de lectura propio. |
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
| `GET /reports/public/looker-studio/tables` | API key | Tablas disponibles para Looker Studio/Data Studio. |
| `GET /reports/public/looker-studio/schema/{table_name}` | API key | Esquema tabular para Looker Studio/Data Studio. |
| `GET /reports/public/looker-studio/data/{table_name}` | API key | Filas planas para Looker Studio/Data Studio. |

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

### `GET /resources` y `GET /resources/catalog`

Query params:

| Parametro | Tipo | Descripcion |
| :--- | :--- | :--- |
| `search` | string | Busca en título, resumen, autores, editorial, DOI, ISBN, temas, curso y tipo. |
| `tipo_recurso_id` | int | Filtra por tipo. |
| `curso_id` | int | Filtra por curso. |
| `skip` | int | Offset, default `0`. |
| `limit` | int | Limite, default `20`. |
| `sort` | string | Solo en `/catalog`: `recent`, `title`, `views` o `downloads`. |

`GET /resources` mantiene el response compatible como lista de `RecursoRead`.

`GET /resources/catalog` responde:

```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "limit": 20,
  "has_more": false
}
```

El orden se ejecuta en backend sobre el conjunto completo, no solo sobre la página cargada. Cuando los recursos están vinculados al modelo bibliográfico, `/catalog` devuelve un representante por obra y añade `obra_id`, `edicion_id`, `ediciones_disponibles`, `archivos_disponibles` y `formatos_disponibles`. Los conteos públicos excluyen archivos pendientes, observados o archivados. `GET /resources` conserva la lista sin agrupación por compatibilidad. `GET /resources/{resource_id}` devuelve la ficha si el recurso está aprobado y `404` en cualquier otro estado.

`search` consulta título, resumen, autores, editorial, DOI, curso y tipo de recurso. La UI carga páginas de 20 registros mediante `skip` y `limit`.

### Obras, ediciones y archivos

Cada recurso nuevo se vincula además con:

- una `obra`, que representa el contenido intelectual;
- una `edición`, que conserva editorial, año, idioma, DOI y uno o varios ISBN;
- un `archivo`, que conserva el ID público estable del recurso, formato, MIME y tamaño.

La vinculación automática reutiliza una edición cuando encuentra el mismo DOI normalizado o un ISBN ya registrado. Si no hay identificador exacto crea una obra y edición independientes para evitar fusiones ambiguas. Un Admin puede consolidarlas posteriormente con el endpoint `merge` sin cambiar los IDs públicos de los recursos.

`GET /works/by-resource/{resource_id}` y `GET /works/{work_id}` solo incluyen archivos de recursos aprobados. Devuelven `404` si el recurso solicitado no es público o si la obra no tiene archivos públicos.

Para registros existentes, después de aplicar Alembic, ejecutar el backfill idempotente:

```bash
cd backend
uv run alembic upgrade head
uv run python -m app.core.backfill_bibliography
```

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
| `isbn` | string | Opcional; se normaliza sin guiones. |
| `anio` | int | Opcional. |
| `idioma` | string | Opcional. |
| `temas` | string | Opcional, separados por coma. |
| `licencia` | string | Opcional. |

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
      "language": "es",
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
| `isbn` | string | Opcional; se normaliza y participa en deduplicación. |
| `anio` | int | Opcional. |
| `external_url` | string | URL legal de referencia. |
| `open_access_url` | string | URL open access legal si existe. |
| `cover_url` | string | URL de portada si existe. |
| `idioma` | string | Idioma bibliográfico. |
| `licencia` | string | Licencia informada por la fuente. |
| `temas` | string[] | Temas normalizados para descubrimiento. |

Response `201`: crea un recurso en estado `Pendiente`, con `archivo_mime="text/html"` y `url_archivo` apuntando a `open_access_url` o `external_url`. No descarga ni almacena archivos externos automaticamente.

Las fuentes aceptadas son `open_library`, `internet_archive`, `crossref`, `openalex` y `unpaywall`. Las URLs persistidas deben usar HTTPS.

Errores esperados: `401`, `403`, `409`, `422`.

## Biblioteca personal

`PUT /library/me/resources/{resource_id}` acepta:

```json
{
  "favorito": true,
  "estado_lectura": "leyendo",
  "progreso_pagina": 18
}
```

`estado_lectura` puede ser `quiero_leer`, `leyendo`, `leido` o `null`; la página debe estar entre 0 y 100000. Solo se pueden guardar recursos aprobados.

Las listas creadas mediante `POST /library/me/lists` usan `{ "nombre": "Termodinámica", "descripcion": "Lecturas", "es_publica": false }`. Los endpoints de edición responden `404` a usuarios ajenos para no revelar listas privadas. `GET /library/lists/{list_id}` es público únicamente cuando `es_publica=true`.

El historial personal reutiliza los eventos `view` y `download`, nunca expone IP ni user agent al propietario y puede eliminarse sin afectar actividades administrativas de otros usuarios. El borrado elimina esos eventos propios tanto de PostgreSQL como de MongoDB; si MongoDB está habilitado y no puede completar la operación, responde `503` antes de borrar la copia SQL.

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

## Power BI y Looker Studio

Los endpoints `/reports/public/*` usan `DASHBOARD_API_KEY`. `GET /reports/public/document-metrics` devuelve agregados de MongoDB para `activity_events` y `external_catalog_cache`; si MongoDB no está inicializado, responde con `mongo_enabled=false` y colecciones vacías para que Power BI mantenga un esquema estable.

Para Looker Studio/Data Studio se exponen tablas planas bajo `/reports/public/looker-studio/*`. Estas rutas separan esquema y datos para que un Community Connector pueda implementar `getSchema()` y `getData()` sin interpretar JSON anidado.

## Verificacion

Ejecutar:

```bash
npm run openapi:check
```

El script importa la app FastAPI, normaliza rutas con parametros y falla si un endpoint real no esta documentado o si el documento conserva rutas inexistentes.
