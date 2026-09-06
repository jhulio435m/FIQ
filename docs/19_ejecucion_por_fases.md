# Ejecución por fases — FIQ

Inicio: 2026-09-06. Rama: `refactor/technical-debt`.

El punto de partida contiene cambios previos en más de 150 rutas. Se preservan;
el cierre de una fase requiere evidencia nueva. Un render Kubernetes no equivale
a un despliegue operativo.

| Fase | Entrega | Estado | Puerta de salida |
| --- | --- | --- | --- |
| P0 | Roles, sesiones revocables, cookies HttpOnly, OAuth state/PKCE, configuración segura | Completada | Pruebas negativas de registro/perfil, refresh/replay/logout, OAuth y configuración validadas (10 auth + 4 runtime) |
| P1 | Runtime y dependencias coherentes, contrato API, pruebas y cobertura | Completada | 58 pruebas backend, 24 unit frontend, 14 E2E Playwright, lint/build ok, OpenAPI 74 endpoints, migración head y downgrade base en DB desechable |
| P2 | Separación de responsabilidades y preparación de PRs | En preparación | Cambios revisables sin regresiones; migraciones existentes intactas |
| P3 | Imágenes inmutables y despliegue con migración, rollout, smoke y rollback | Pendiente | Pipeline revisable y comprobaciones locales; credenciales de staging para ejecución remota |
| P4 | Stack integrado y staging con HTTPS, SMTP y almacenamiento real | Pendiente | E2E completo y flujo externo de upload/moderación/lectura |
| P5 | Restauración, failover, carga y alertas | Pendiente | Ejercicios medidos en destinos desechables; RPO/RTO demostrados |
| P6 | Texto completo/OCR/lector, descubrimiento/comunidad y operación masiva | Pendiente | Entregas funcionales incrementales después de estabilizar la base |

## Decisiones y compatibilidad

- El rol y estado se gestionan exclusivamente en endpoints administrativos.
- Access JWT en memoria; refresh opaco en cookie HttpOnly, hash persistido y consumo
  atómico. Logout, cambio de contraseña y reutilización de refresh revocan las sesiones.
- Se invalidan los JWT antiguos al activar la migración `d1e2f3a4b5c6`: los usuarios
  deben iniciar sesión nuevamente. Backend y frontend deben publicarse juntos.
- Refresh y logout requieren `X-Requested-With: FIQ`. Los clientes externos deben
  mantener un cookie jar; no reciben refresh tokens en JSON.
- HTTP local requiere `SESSION_COOKIE_SECURE=false`; staging y producción exigen HTTPS.
- La migración se aplica primero en una base desechable. No se modifica una migración
  previamente versionada ni se usa `create_all` para desplegar.
- El bloqueo previo de pytest no se reprodujo fuera del sandbox: la suite original
  pasó 39 pruebas en Python 3.14. La diferencia 3.14 local / 3.13 CI se trata como
  inconsistencia de entornos, no como causa demostrada de aquel bloqueo.

## Evidencia

- Línea base: 39 pruebas backend iniciales superadas.
- Seguridad de autenticación y runtime (P0): 10 pruebas negativas aprobadas en `test_auth_security.py` (rechazo de rol en registro, privilegios inmutables en perfil, rotación/replay con revocación en cascada, logout atómico con limpieza de cookie, CSRF/cabecera `X-Requested-With`, OAuth PKCE y state) + 4 pruebas en `test_runtime_security.py` (rechazo de defaults en producción, CORS estricto, antivirus no eludible, dashboard API key). Total suite backend: 58 pruebas pasando.
- Calidad y frontend (P1): 24 pruebas unitarias Vitest aprobadas, build de producción `tsc -b && vite build` exitoso sin errores de tipos, ESLint con 0 advertencias/errores.
- Contrato API (P1): `npm run openapi:check` validó 78 endpoints documentados y consistentes (incluidos los 4 endpoints de marcadores y lectura de Fase 4).
- Migración y rollback en DB desechable (P1/Fase 4): en base PostgreSQL temporal se ejecutó `alembic upgrade head` recorriendo toda la cadena (`7ad9edad17b3` -> ... -> `e2f3a4b5c6d7`) y posteriormente downgrade sin fallos. El contenedor productivo local `fiq-phases-postgres-1` se encuentra actualizado en `e2f3a4b5c6d7`.
- Integración E2E (P1/Fase 4): 14 escenarios de Playwright aprobados sobre los servicios Docker reales (`fiq-phases-*`), cubriendo catálogo, búsqueda híbrida local/APIs, descargas, Mi biblioteca, visor PDF seguro con notas, portadas, laboratorios, autenticación por cookies/revocación y moderación.
- Deuda técnica y Texto Completo (P1-03 & Fase 4):
  - 230 advertencias de deprecación SQLModel (`session.execute` vs `db.exec`) eliminadas al 100% en todo el código propio del backend.
  - Extracción de texto seguro en PDFs con `pypdf`, búsqueda `tsvector` en PostgreSQL y snippets de coincidencia contextual en catálogo y tarjetas.
  - Marcadores de lectura y notas privadas en visor PDF (`PdfViewer`) y persistencia en backend.
  - Suite de pruebas backend: 63 pruebas pasando (100%).
  - Suite de pruebas frontend: 27 pruebas unitarias Vitest pasando (100%).

## Requisitos para las fases remotas

Verificar acceso al cluster y capacidad efectiva antes de provisionar volúmenes.
La documentación declara 500 GiB para documentos y 600 GiB para backups; la cifra
antigua de 142 GiB libres no se considera medición actual. Dominio institucional,
SMTP y secretos se suministran por canales de despliegue, nunca en Git.
