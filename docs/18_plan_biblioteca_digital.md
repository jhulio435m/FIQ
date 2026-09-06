# Plan de evolución de la Biblioteca Digital FIQ

## Objetivo

Convertir la biblioteca actual en un catálogo académico de gran escala, con una experiencia de descubrimiento y lectura comparable a servicios bibliográficos modernos, pero limitado a documentos institucionales, autorizados o de acceso abierto.

## Principios

- Mantener un único buscador con selección explícita entre catálogo local y APIs académicas.
- No publicar automáticamente contenido externo: toda importación pasa por moderación.
- Conservar atribución, licencia y URL de procedencia.
- Evolucionar el esquema de forma aditiva; no modificar migraciones ya existentes.
- Mantener compatibilidad con los consumidores actuales de `GET /resources` durante la transición.
- Separar metadatos bibliográficos de los archivos en fases posteriores, sin migraciones destructivas tempranas.

## Fase 1 — Catálogo confiable y enlaces permanentes

Estado: **completada y validada en el runtime Docker local**.

### Alcance

1. Añadir `GET /resources/catalog` con:
   - total real de resultados;
   - paginación `skip`/`limit`;
   - orden global por fecha, título, vistas o descargas;
   - filtros por tipo y curso;
   - búsqueda en título, resumen, autor, editorial, DOI, ISBN, temas, curso y tipo.
2. Mantener `GET /resources` como contrato compatible temporal.
3. Añadir `GET /resources/{id}` para una ficha pública aprobada.
4. Incorporar URL permanente `/biblioteca/recurso/{id}`.
5. Separar DOI e ISBN y persistir portada, idioma, licencia, temas y procedencia externa.
6. Mostrar portada y metadatos bibliográficos en tarjetas y detalle.

### Criterios de aceptación

- El contador representa el total del catálogo, no solo la página cargada.
- Cambiar el orden consulta nuevamente el backend y afecta todo el conjunto.
- Un enlace permanente abre el recurso correcto incluso al cargarlo directamente.
- Un libro importado no guarda el ISBN en el campo DOI.
- Solo los recursos aprobados son visibles en el catálogo y en la ficha pública.
- Backend, frontend, OpenAPI y migraciones superan sus gates aplicables.

### Evidencia local

- Endpoint paginado y ficha pública implementados.
- Orden global delegado al backend.
- DOI e ISBN separados; portada, idioma, licencia, temas y procedencia persistentes.
- URL permanente y acción para copiar enlace implementadas.
- Recursos pendientes protegidos frente a detalle, visor, vista y descarga pública.
- Pytest, Vitest, ESLint, build, OpenAPI y grafo de Alembic validados.
- PostgreSQL migrado a `f6a1b2c3d4e5` en el runtime local.
- `postgres`, `redis`, `mongo`, `minio`, `backend` y `frontend` quedaron saludables.
- Suite E2E completa: 11 casos aprobados, incluidos permalink, buscador local/APIs, autenticación, descarga, perfil, laboratorios y moderación.
- Auditoría npm de dependencias de producción: 0 vulnerabilidades después de actualizar el lockfile dentro de rangos compatibles.

## Fase 2 — Biblioteca personal

Estado: **completada y validada en el runtime Docker local**.

### Alcance

- Favoritos.
- Listas privadas y públicas.
- Estados `Quiero leer`, `Leyendo` y `Leído`.
- Historial de consulta y descarga visible para el propietario.
- Progreso de lectura por documento y página.
- Controles de privacidad y eliminación de historial.

### Modelo previsto

- `biblioteca_usuario_recurso`: usuario, recurso, estado, favorito, progreso y última lectura.
- `listas_biblioteca`: propietario, nombre, descripción y visibilidad.
- `lista_recursos`: lista, recurso, posición y fecha de incorporación.

### Entrega implementada

- API JWT para favoritos, estados y progreso por página.
- Listas privadas por defecto, opción pública y autorización exclusiva del propietario para modificarlas.
- Historial personal de vistas y descargas, sin exponer datos técnicos de auditoría.
- Borrado del historial limitado al usuario autenticado.
- Vista protegida `/mi-biblioteca` y controles dentro del detalle del recurso.
- Compatibilidad con IDs públicos del catálogo fragmentado.
- Migración aditiva `a7b8c9d0e1f2`; ninguna migración previa fue modificada.

### Evidencia local

- 31 pruebas backend aprobadas, incluidas privacidad, autorización y validación de progreso.
- 18 pruebas unitarias frontend aprobadas.
- 12 recorridos Playwright aprobados, incluido favorito → `Mi biblioteca`.
- ESLint, build de producción y contrato OpenAPI de 69 endpoints aprobados.
- PostgreSQL migrado de `f6a1b2c3d4e5` a `a7b8c9d0e1f2`.
- Backend y frontend responden saludables desde Docker; `/mi-biblioteca` devuelve HTTP 200.

## Fase 3 — Obra, edición y archivo

Estado: **completada y validada en el runtime Docker local**.

### Alcance

- Introducir las entidades `obra`, `edicion` y `archivo_recurso`.
- Agrupar formatos y ediciones sin duplicar resultados.
- Permitir varios ISBN por edición y un DOI por publicación cuando corresponda.
- Migrar los registros actuales mediante expand/backfill/switch/contract.
- Mantener los IDs públicos estables durante la transición.

### Entrega implementada

- Modelo relacional aditivo `obra → edición → archivo`, con varios ISBN por edición y DOI único cuando existe.
- Vinculación automática de uploads e importaciones; coincidencias exactas por DOI normalizado o ISBN reutilizan edición.
- `GET /resources/catalog` agrupa resultados por obra después del backfill y conserva `GET /resources` sin agrupación por compatibilidad.
- Ficha pública de obra y consulta por ID estable de recurso, limitadas a archivos aprobados.
- Panel de ediciones y formatos dentro del detalle del recurso y resumen compacto en tarjetas con múltiples variantes.
- Sincronización idempotente de registros legados y fusión manual de obras protegida con rol Admin.
- Compatibilidad con IDs públicos de recursos fragmentados; una fusión mueve ediciones, no cambia ni elimina recursos.
- Migración aditiva `b8c9d0e1f2a3`; ninguna migración previa fue modificada.

### Evidencia local

- 37 pruebas backend aprobadas, incluidas agrupación DOI/ISBN, formatos múltiples, privacidad de pendientes, sincronización y RBAC de fusión.
- 22 pruebas unitarias frontend aprobadas.
- 13 recorridos Playwright aprobados, incluida la visualización de edición y archivo actual.
- ESLint, build de producción y contrato OpenAPI de 73 endpoints aprobados.
- PostgreSQL migrado de `a7b8c9d0e1f2` a `b8c9d0e1f2a3`.
- Backfill ejecutado dos veces sin duplicar filas: antes del E2E, 7 recursos, 7 obras, 7 ediciones y 7 archivos.
- Un upload posterior al backfill mantuvo la escritura sincronizada: 8 recursos y 8 archivos bibliográficos.
- Backend y frontend reconstruidos en Docker; `/health`, `/biblioteca`, `/resources/catalog` y `/works/by-resource/{id}` respondieron correctamente.

## Fase 4 — Texto completo y lector

Estado: **completada y validada en el runtime Docker local**.

### Alcance

- Extracción de texto de PDF.
- OCR para documentos escaneados.
- Índice PostgreSQL `tsvector` inicialmente; evaluar OpenSearch solo con evidencia de escala.
- Fragmentos y resaltado de coincidencias.
- EPUB con validación segura.
- Marcadores, anotaciones y continuidad de lectura.

### Entrega implementada

- Extracción segura de texto en uploads PDF con `pypdf`, truncamiento defensivo y saneamiento de caracteres de control.
- Columna `contenido_texto` en `Recurso` e índice PostgreSQL invertido GIN con `to_tsvector('spanish', ...)` sobre título, resumen, temas y contenido textual.
- Generación de snippets de contexto (`extract_search_snippet`) para búsquedas en texto completo en endpoints `/resources` y `/resources/catalog`.
- Tarjeta de recurso con badge visual de "Coincidencia en texto" y extracto del contenido cuando coincide con el término de búsqueda.
- Modelo y tabla `marcador_lectura` con página, título, contenido opcional, color y fechas de auditoría.
- Endpoints CRUD de marcadores de lectura con aislamiento estricto por usuario y RBAC (`/library/me/resources/{id}/bookmarks` y `/library/me/bookmarks/{id}`).
- Visor PDF seguro (`PdfViewer`) enriquecido con panel lateral de "Marcadores y Notas", navegación rápida por página y creación interactiva de apuntes con códigos de color institucional.
- Migración aditiva Alembic `e2f3a4b5c6d7_add_fulltext_and_reading_notes.py`, aplicada y probada de ida y vuelta (`upgrade head` / `downgrade -1`).

### Evidencia local

- 63 pruebas backend aprobadas (100% de la suite pytest), incluyendo extracción de texto, snippets contextuales, búsqueda de texto completo y ciclo de vida de marcadores.
- 27 pruebas unitarias frontend aprobadas (14 archivos de prueba Vitest), incluyendo servicios de marcadores y renderizado de componentes.
- 14 pruebas Playwright E2E aprobadas en entorno local contra contenedores Docker reales.
- ESLint con 0 errores y 0 warnings; compilación de producción de Vite exitosa en 818ms.
- Paridad OpenAPI de 78 endpoints documentados y verificados (`npm run openapi:check`).

## Fase 5 — Descubrimiento y comunidad

### Alcance

- Recursos relacionados por curso, tema y co-consulta.
- Carruseles de novedades y popularidad.
- Recomendaciones con explicación y opción de desactivación.
- Valoraciones y reseñas moderadas.
- Reportes de archivo corrupto, duplicado o metadatos incorrectos.
- Sugerencias de corrección con historial de moderación.

## Fase 6 — Operación a escala

Estado: **base técnica implementada; validación de infraestructura remota pendiente**.

### Alcance

- Importación masiva CSV/DOI/ISBN con vista previa y validación.
- Detección de duplicados y trabajos de enriquecimiento en segundo plano.
- Antivirus, cuarentena y reprocesamiento de archivos.
- Panel de consultas sin resultados y calidad de metadatos.
- Backups, restauración, observabilidad y pruebas de carga verificadas en staging.

### Entrega operativa aplicada

- Incrementos atómicos de vistas/descargas y lectura de objetos por streaming de 64 KiB.
- Rate limit Redis atómico para login propio, JWT/cookie y APIs externas, con control seguro de `CF-Connecting-IP`.
- ClamAV por TCP, estado de análisis, confirmación de cargas directas y bucket de cuarentena.
- Recuperación de contraseña por SMTP configurable y pantalla `/recuperar-contrasena`.
- Métricas Prometheus en `/metrics`, scrape del backend y alertas de caída, errores y latencia.
- Backups PostgreSQL, MongoDB y MinIO; verificación de checksum y restore lógico explícito para destinos desechables.
- PVC declarados para 500 GiB de documentos y 600 GiB de backups; requieren capacidad real antes del despliegue.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Duplicados entre proveedores | Resolver por DOI, ISBN normalizado y posteriormente por obra/edición. |
| Metadatos externos maliciosos o incorrectos | Normalización, límites de longitud y moderación antes de publicar. |
| Contenido sin permiso | Guardar licencia/procedencia y aceptar únicamente material institucional, autorizado o abierto. |
| Cambio de API incompatible | Añadir `/catalog`, migrar el frontend y retirar el contrato anterior en otra versión. |
| Índices costosos en producción | Migraciones aditivas e índices concurrentes cuando el volumen lo requiera. |
| Exposición del historial del estudiante | Datos privados por defecto, minimización y borrado por el propietario. |

## Orden de entrega

1. Catálogo paginado, orden global y ficha permanente.
2. Metadatos bibliográficos persistentes.
3. Favoritos, listas e historial.
4. Obra/edición/archivo.
5. Texto completo, OCR y EPUB.
6. Recomendaciones, comunidad y operación masiva.
