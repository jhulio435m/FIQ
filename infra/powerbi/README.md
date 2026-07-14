# FIQ Power BI Public API

Power BI debe consumir la API pública controlada, no conectarse directo a PostgreSQL ni MongoDB.

## Endpoints

- `/reports/public/dashboard-data`
- `/reports/public/resources`
- `/reports/public/courses`
- `/reports/public/users`
- `/reports/public/activities`
- `/reports/public/document-metrics`

Todos requieren `api_key` y usan `DASHBOARD_API_KEY`.

## Recomendación de Consulta

En Power BI usar Web connector con URL:

```text
https://<dominio>/api/reports/public/dashboard-data?api_key=<valor>
```

Para Mongo documental:

```text
https://<dominio>/api/reports/public/document-metrics?api_key=<valor>
```

## Seguridad

- Rotar `DASHBOARD_API_KEY`.
- Aplicar rate limit en Cloudflare.
- No publicar URLs internas, secrets ni datos personales innecesarios.
- Preferir agregados para tableros ejecutivos.
