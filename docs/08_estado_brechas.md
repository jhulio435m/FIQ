# 08. Estado Actual, Brechas y Continuidad

## Alcance de la revision

Revision ejecutada contra la documentacion `docs/01` a `docs/07`, `README.md`, `AGENTS.md`, skills locales de FastAPI, React, testing, Playwright y migraciones, y el codigo actual de `backend/`, `frontend/`, `compose.yaml` y `.github/workflows/ci.yml`.

## Estado verificado del producto

| Area | Estado | Evidencia |
| :--- | :--- | :--- |
| Monorepo y tooling | Implementado | `package.json`, `frontend/package.json`, `backend/pyproject.toml`, hooks Husky y commitlint. |
| Backend FastAPI | Implementado con deuda menor | Routers activos para auth, users, resources, labs, activity y reports. |
| Frontend React | Implementado y cubierto por pruebas unitarias | Rutas para home, login, biblioteca, laboratorios, perfil y admin. |
| Docker Compose local | Implementado | Servicios backend, frontend, postgres, redis y minio. PostgreSQL expuesto en `5433`. |
| CI base | Implementado | `.github/workflows/ci.yml` ejecuta backend tests, lint, build y Playwright. |
| Biblioteca digital | Implementada | Un buscador con toggle Local/APIs, paginación, tipos, cursos, detalle PDF/externo, upload, tracking y moderación. |
| Laboratorios | Implementado con simuladores interactivos | Registro aislado de destilación, cinética, termodinámica y reactores. |
| Auditoria y reportes | Implementacion inicial | Logs y reportes agregados disponibles para Admin. |
| Infra productiva | Declarativa y validada en render; runtime remoto pendiente | Compose local saludable; Kubernetes, dominio y HA remoto requieren credenciales/cluster accesibles. |

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
| P0-01 | Ejecutar Playwright y Compose en un host con Docker activo. | El código puede pasar pruebas aisladas sin probar el flujo integrado real. | Levantar el stack, sembrar datos y ejecutar `npm run test:e2e`. |
| P0-02 | Validar despliegue Kubernetes en staging y producción reales. | Renderizar manifiestos no demuestra disponibilidad ni persistencia. | Aplicar overlays, revisar probes, PVC, túneles y restauración. |

### P1 - Calidad de producto

| ID | Brecha | Impacto | Siguiente accion |
| :--- | :--- | :--- | :--- |
| P1-01 | Redis y el endpoint JWT deben compartir el límite entre réplicas. | Un límite por proceso permite evadirlo. | Cerrado: limiter Redis con ventana atómica, proxy confiable y dependencia en `/auth/jwt/login`. |
| P1-02 | Recuperación de contraseña necesita proveedor institucional operativo. | Sin SMTP configurado no se entrega el enlace. | Cerrado en código: SMTP sin registrar tokens, pantalla `/recuperar-contrasena`; falta cargar secretos y probar entrega. |
| P1-05 | Contadores de vistas/descargas sufrían lost updates bajo concurrencia y el archivo se cargaba completo en RAM. | Estadísticas incorrectas y picos de memoria con PDFs de 20 MB. | Cerrado: `UPDATE contador = contador + 1` y `StreamingResponse` por bloques. |
| P1-06 | Cargas directas no tenían confirmación antivirus. | Un objeto presigned podía aprobarse sin análisis. | Cerrado: estado `pending`, `complete-upload`, ClamAV TCP, cuarentena y bloqueo de aprobación. |
| P1-03 | Persisten warnings de React/SQLModel y un chunk cercano a 500 kB. | Deuda de mantenimiento y rendimiento inicial. | Cerrado: chunks divididos bajo 370 kB; llamadas a session.execute migradas a db.exec en toda la aplicación propia. |
| P1-04 | Los E2E aún usan selectores CSS posicionales en flujos antiguos. | Fragilidad ante cambios visuales. | Migrar gradualmente a roles, labels y fixtures compartidos. |

### P2 - Produccion e infraestructura

| ID | Brecha | Impacto | Siguiente accion |
| :--- | :--- | :--- | :--- |
| P2-01 | Los manifiestos usan imágenes `latest` en varios componentes. | Despliegues no reproducibles. | Fijar tags o digests validados. |
| P2-02 | Los backups declarados siguen requiriendo ejecución en infraestructura real. | Un backup no restaurable no reduce el riesgo operativo. | Cerrado en scripts: backup PostgreSQL/Mongo/MinIO, checksum y restore lógico opcional protegido; ejecutar en staging y registrar evidencia. |
| P2-03 | El host actual no tiene capacidad para los PVC productivos declarados. | 500 GiB de documentos + 600 GiB de backups no caben en los 142 GiB libres observados. | Ampliar almacenamiento o provisionar nodos/PV antes de aplicar producción. |
| P2-04 | No existe cluster staging ni dominio Cloudflare administrado accesible desde este entorno. | No se puede validar probes, HTTPS, alertas ni caída de réplica. | Aplicar overlay en staging real, configurar DNS/túnel nombrado y ejecutar failover autorizado. |

## Recomendacion de continuidad

1. Ejecutar el stack real y Playwright en un host con Docker activo.
2. Aplicar y verificar staging antes de producción.
3. Cargar Redis/SMTP/ClamAV y secretos institucionales en staging.
4. Reducir warnings y deuda de selectores E2E.

## Skills aplicadas

- `fastapi-backend`: revision de routers, contratos, RBAC y errores HTTP.
- `react-frontend`: revision de tipado, estado de servidor con TanStack Query y convenciones React.
- `testing`: priorizacion de pytest, Playwright y brecha Vitest/RTL.
- `playwright`: evaluacion de cobertura E2E y necesidad futura de Page Objects.
- `db-migrations`: cambios compatibles sin editar migraciones existentes.
