# 05. Especificación de la API

## 📡 Diseño de la API (RESTful)

El backend (FastAPI) expondrá una API REST consumida por el frontend en React.

### 🔐 Protocolo de Autenticación
*   **JWT (JSON Web Tokens):** Tokens de acceso con expiración corta y Refresh Tokens para persistencia de sesión segura.

### 🌐 Catálogo de Endpoints

#### Autenticación
*   `POST /auth/login`: Autenticación y generación de tokens.
*   `POST /auth/logout`: Invalidación de sesión.
*   `POST /auth/forgot-password`: Envío de enlace de recuperación.

#### Gestión de Usuarios (Admin)
*   `GET /users`: Listado paginado con filtros.
*   `POST /users`: Registro administrativo de nuevos usuarios.
*   `PATCH /users/{id}/status`: Activar o desactivar usuarios.
*   `PATCH /users/{id}/role`: Cambio de rol/permisos.

#### Biblioteca y Recursos
*   `GET /resources`: Buscador público de recursos aprobados.
*   `POST /resources`: Subida de recurso por docente (Estado: Pendiente).
*   `GET /resources/pending`: Listado para revisión administrativa.
*   `PATCH /resources/{id}/approve`: Aprobación y publicación oficial.
*   `PATCH /resources/{id}/observe`: Devolución con comentarios técnicos.
*   `DELETE /resources/{id}`: Archivado lógico del recurso.

#### Laboratorios
*   `GET /labs`: Listado de módulos por nivel de dificultad.
*   `GET /labs/{id}`: Acceso y metadatos de la simulación.

#### Auditoría y Reportes
*   `GET /activity`: Consulta de logs globales (Solo Admin).
*   `GET /reports/most-viewed`: Analítica de los recursos más consultados.
*   `GET /reports/labs-usage`: Analítica de uso de simuladores.
