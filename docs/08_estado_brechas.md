# 08. Estado Actual, Brechas y Continuidad

## Alcance de la revision

Revision ejecutada contra la documentacion `docs/01` a `docs/07`, `README.md`, `AGENTS.md`, skills locales de FastAPI, React, testing, Playwright y migraciones, y el codigo actual de `backend/`, `frontend/`, `docker-compose.yml` y `.github/workflows/ci.yml`.

## Estado verificado del producto

| Area | Estado | Evidencia |
| :--- | :--- | :--- |
| Monorepo y tooling | Implementado | `package.json`, `frontend/package.json`, `backend/pyproject.toml`, hooks Husky y commitlint. |
| Backend FastAPI | Implementado con deuda menor | Routers activos para auth, users, resources, labs, activity y reports. |
| Frontend React | Implementado con deuda de pruebas unitarias | Rutas para home, login, biblioteca, laboratorios, perfil y admin. |
| Docker Compose local | Implementado | Servicios backend, frontend, postgres, redis y minio. PostgreSQL expuesto en `5433`. |
| CI base | Implementado | `.github/workflows/ci.yml` ejecuta backend tests, lint, build y Playwright. |
| Biblioteca digital | Implementada | Search, tipos, cursos, detalle, preview PDF, upload, tracking y moderacion. |
| Laboratorios | Implementado como catalogo | Lista y detalle de modulos; falta experiencia interactiva real por modulo. |
| Auditoria y reportes | Implementacion inicial | Logs y reportes agregados disponibles para Admin. |
| Infra productiva | Parcial | Existe `render.yaml`; faltan manifiestos Kubernetes, Cloudflare Tunnel, backup y observabilidad reales. |

## Brechas cerradas en esta revision

| Brecha | Accion aplicada | Resultado esperado |
| :--- | :--- | :--- |
| `DELETE /resources/{id}` estaba documentado pero no existia. | Se agrego archivado logico con estado `Archivado`, historial y auditoria opcional `resource_archive`. | Admin puede retirar recursos sin borrado fisico y el recurso deja de aparecer en busqueda publica. |
| El seed no tenia tipo de actividad para archivado. | Se agrego `resource_archive` al seed. | El archivado puede quedar trazado cuando la tabla de tipos esta poblada. |
| `.env.example` apuntaba a Postgres `5432`, pero Compose publica `5433`. | Se actualizo `DATABASE_URL` a `localhost:5433`. | El backend local usa el puerto correcto con el Compose actual. |
| Habia `any` en TypeScript. | Se tiparon errores Axios y wrapper minimo de PDF.js. | Se alinea con AGENTS y Definition of Done. |

## Brechas pendientes por prioridad

### P0 - Validacion obligatoria antes de release

| ID | Brecha | Impacto | Siguiente accion |
| :--- | :--- | :--- | :--- |
| P0-01 | Ejecutar suite completa despues de cada cambio: pytest, lint, build, Playwright y Compose. | Sin evidencia actualizada no se puede declarar release candidate. | Mantener checklist: `uv run --extra dev pytest`, `npm run lint`, `npm run build`, `npm run test:e2e`, `docker compose up -d --build`. |
| P0-02 | Verificar OpenAPI contra `docs/05_especificacion_api.md`. | Riesgo de documentacion desalineada con contratos reales. | Exportar `/openapi.json` y comparar endpoints, payloads y codigos de error. |
| P0-03 | Completar pruebas negativas de seguridad de upload. | Riesgo de aceptar archivos malformados o roles incorrectos. | Pytest para MIME, magic number, tamano maximo, 401/403 y archivo no PDF. |

### P1 - Calidad de producto

| ID | Brecha | Impacto | Siguiente accion |
| :--- | :--- | :--- | :--- |
| P1-01 | No hay Vitest/RTL ni MSW configurados aunque la estrategia lo exige. | El frontend depende casi totalmente de E2E. | Agregar Vitest, RTL, jest-dom, MSW y pruebas de login, biblioteca, upload-dialog y admin. |
| P1-02 | Los E2E no usan Page Object Model. | Selectores y flujos pueden duplicarse o volverse fragiles. | Introducir `frontend/e2e/pages/` y helpers compartidos para login, biblioteca, admin y perfil. |
| P1-03 | Reportes y actividad tienen UI basica. | Admin tiene visibilidad parcial del uso real. | Agregar filtros por fecha, usuario, accion y estados vacios/error/loading. |
| P1-04 | Laboratorios son catalogo, no simuladores interactivos. | El valor educativo esta incompleto. | Implementar al menos un modulo interactivo real y registrar `lab_access` desde detalle. |

### P2 - Produccion e infraestructura

| ID | Brecha | Impacto | Siguiente accion |
| :--- | :--- | :--- | :--- |
| P2-01 | No hay manifiestos Kubernetes versionados. | No se cumple el destino dev -> Kubernetes prod. | Crear `infra/k8s/` con deployments, services, ingress, configmaps, external secrets y probes. |
| P2-02 | Cloudflare Tunnel esta documentado, pero no configurado en repo. | Falta evidencia de acceso Zero Trust. | Agregar plantilla `cloudflared` y guia de variables sin secretos. |
| P2-03 | Backups y restore no estan automatizados. | Riesgo operativo para PostgreSQL y MinIO/S3. | Documentar job de backup, retencion, prueba de restore y versionamiento de bucket. |
| P2-04 | Observabilidad minima no esta materializada. | No hay trazabilidad operacional de latencia, errores ni disponibilidad. | Agregar health checks extendidos, metricas basicas y logging estructurado centralizable. |

## Recomendacion de continuidad

1. Cerrar P0 con verificacion completa y pruebas negativas backend.
2. Agregar Vitest/RTL/MSW para cubrir estados de UI que Playwright no debe absorber.
3. Refactorizar E2E con Page Objects solo despues de que la suite actual este verde.
4. Preparar `infra/k8s/` y Cloudflare como siguiente incremento de despliegue, sin subir secretos.
5. Convertir el primer laboratorio en una simulacion interactiva real para que el modulo deje de ser solo catalogo.

## Skills aplicadas

- `fastapi-backend`: revision de routers, contratos, RBAC y errores HTTP.
- `react-frontend`: revision de tipado, estado de servidor con TanStack Query y convenciones React.
- `testing`: priorizacion de pytest, Playwright y brecha Vitest/RTL.
- `playwright`: evaluacion de cobertura E2E y necesidad futura de Page Objects.
- `db-migrations`: cambios compatibles sin editar migraciones existentes.
