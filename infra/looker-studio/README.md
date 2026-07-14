# FIQ Looker Studio / Data Studio API

Looker Studio debe consumir la API pública controlada, no conectarse directo a PostgreSQL ni MongoDB.

## Endpoints

Todos requieren `api_key=<DASHBOARD_API_KEY>`.

- `GET /reports/public/looker-studio/tables`
- `GET /reports/public/looker-studio/schema/{table_name}`
- `GET /reports/public/looker-studio/data/{table_name}`

Tablas disponibles:

- `summary`
- `resources`
- `courses`
- `users`
- `activities`
- `document_activity_by_type`
- `document_activity_by_date`
- `external_cache_by_kind`
- `external_cache_recent`

Ejemplo:

```text
https://<dominio>/reports/public/looker-studio/data/resources?api_key=<valor>
```

## Conector Apps Script

El archivo `apps-script/Code.js` implementa un Community Connector para Looker Studio:

- `getConfig()` pide Base URL, API key y tabla.
- `getSchema()` lee el esquema desde la API.
- `getData()` devuelve filas en el formato tabular esperado.

Configurar en Looker Studio:

1. Crear un Community Connector en Apps Script.
2. Pegar el contenido de `apps-script/Code.js`.
3. Autorizar el proyecto.
4. Usar una Base URL pública, por ejemplo `https://fiq.example.edu.pe`.
5. Ingresar `DASHBOARD_API_KEY`.
6. Elegir una tabla.

## Seguridad

- Mantener `DASHBOARD_API_KEY` fuera del repo.
- Publicar estos endpoints solo detrás de Cloudflare WAF/rate limit.
- No usar esta API para datos personales sensibles.
- La tabla `users` para Looker Studio no expone email.
