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

---

## 📝 Estructura de Payloads (Ejemplos)

### 1. Inicio de Sesión (`POST /auth/login`)
*   **Request Body:**
    ```json
    {
      "email": "usuario@uncp.edu.pe",
      "password": "PasswordSeguro123!"
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "usuario": {
        "id": 1024,
        "nombre": "Jhulio Moran",
        "email": "usuario@uncp.edu.pe",
        "rol": "Docente"
      }
    }
    ```

### 2. Carga de Recurso (`POST /resources`)
*   **Request Body (Multipart/Form-Data):**
    *   `file`: (Archivo binario PDF, max 20MB)
    *   `titulo`: "Guía de Laboratorio de Operaciones Unitarias I"
    *   `resumen`: "Introducción práctica a los balances de materia y energía en columnas de destilación."
    *   `tipo_recurso_id`: 2 (Manual)
    *   `curso_id`: 5 (Operaciones Unitarias I)
    *   `autores_ids`: `[12, 15]`
    *   `etiquetas`: `["laboratorio", "química", "destilación"]`
*   **Response Body (201 Created):**
    ```json
    {
      "id": "e8a946ad-598d-4f7f-8d2a-436d654ea475",
      "titulo": "Guía de Laboratorio de Operaciones Unitarias I",
      "url_archivo": "https://s3.amazonaws.com/fiq-bucket/resources/e8a946ad-598d-4f7f-8d2a-436d654ea475.pdf",
      "archivo_size": 4120340,
      "archivo_mime": "application/pdf",
      "subido_por": 1024,
      "estado": "Pendiente",
      "created_at": "2026-06-04T16:17:40Z"
    }
    ```

---

## 🚫 Estructura Estándar de Errores

Todas las respuestas de error siguen el estándar de FastAPI con una lista detallada de errores:

*   **Error de Validación (422 Unprocessable Entity):**
    ```json
    {
      "detail": [
        {
          "loc": ["body", "email"],
          "msg": "value is not a valid email address",
          "type": "value_error.email"
        }
      ]
    }
    ```
*   **Error Genérico del Sistema (400/401/403/404):**
    ```json
    {
      "detail": "El recurso solicitado no existe o no tiene permisos de acceso."
    }
    ```

