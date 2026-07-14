# 13. Integraciones Externas Bibliograficas

## Objetivo

Enriquecer la biblioteca virtual con metadatos legales y trazables desde catalogos abiertos, sin exponer claves en frontend ni mezclar resultados externos con recursos internos aprobados.

## APIs integradas

| Fuente | Uso | Endpoint interno |
| :--- | :--- | :--- |
| Open Library | Libros, autores, ISBN, portadas | `GET /external/search/books` |
| Open Library Covers | Portadas por ISBN | `GET /external/search/books` |
| Internet Archive | Libros/documentos digitalizados legales | `GET /external/search/books` |
| Crossref | DOI y metadatos de articulos | `GET /external/search/articles` |
| OpenAlex | Obras academicas, autores, fuentes y acceso abierto | `GET /external/search/articles` |
| Unpaywall | Verificacion de acceso abierto legal por DOI | `GET /external/search/articles` |

Google Books, CORE, Semantic Scholar, Library of Congress y Europeana quedan como integraciones de segunda fase para evitar complejidad y dependencias de claves antes de estabilizar el flujo principal.

## Arquitectura

React consume solo endpoints propios:

```txt
GET /external/search/books?q=&isbn=&limit=
GET /external/search/articles?q=&doi=&limit=
POST /resources/import-external
```

El backend se encarga de:

- Normalizar respuestas a `ExternalWork`.
- Aplicar timeouts.
- Identificar la app con `EXTERNAL_API_USER_AGENT`.
- Mantener claves o emails fuera del frontend.
- Devolver warnings por proveedor sin filtrar trazas internas.
- Convertir un resultado externo en recurso local pendiente de aprobacion.

## Variables

| Variable | Requerida | Uso |
| :--- | :--- | :--- |
| `EXTERNAL_API_EMAIL` | Opcional, recomendada | Uso educado en Crossref/OpenAlex y requerida para Unpaywall. |
| `EXTERNAL_API_USER_AGENT` | Opcional | Identificacion HTTP ante proveedores externos. |
| `EXTERNAL_API_TIMEOUT_SECONDS` | Opcional | Timeout por request externo. |

## Flujo de importacion

1. Usuario busca en Biblioteca.
2. La seccion "Fuentes externas" consulta libros o articulos.
3. Docente/Admin presiona "Importar".
4. Backend valida rol, tipo local, curso opcional y DOI duplicado.
5. Se crea un `Recurso` en estado `Pendiente`.
6. Admin revisa y aprueba/observa como cualquier upload.

La importacion no descarga archivos externos automaticamente. Guarda una URL legal de referencia en `url_archivo` y `archivo_mime="text/html"`.

## Seguridad y calidad

- No hay llamadas directas desde frontend a APIs externas.
- No se exponen API keys ni emails en JavaScript.
- Un DOI duplicado responde `409`.
- Estudiante recibe `403` al intentar importar.
- Fallas de proveedor devuelven warnings y no rompen toda la busqueda.
- Los recursos importados no aparecen en catalogo publico hasta ser aprobados.

## Pruebas

Casos cubiertos en backend:

| Caso | Evidencia |
| :--- | :--- |
| Busqueda externa agregada sin internet | Mock de Open Library e Internet Archive. |
| Importacion por Docente | Crea recurso pendiente. |
| DOI duplicado | Responde `409`. |
| Rol Estudiante | Responde `403`. |

Ejecutar:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```
