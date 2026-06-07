# 05. Especificación de la API

## 📡 Diseño de la API (RESTful)

El backend (FastAPI) expondrá una API REST consumida por el frontend en React.

### 🔐 Protocolo de Autenticación
*   **JWT (JSON Web Tokens): Tokens con tipado de ID corregido (int) para estabilidad.** Tokens de acceso con expiración corta y Refresh Tokens para persistencia de sesión segura.

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
*   `GET /resources/types`: Lista de tipos de recurso (Libro, Apunte, Tesis...).
*   `GET /resources`: Buscador público de recursos aprobados (query: `search`, `tipo_recurso_id`, `skip`, `limit`).
*   `POST /resources`: Subida de recurso por docente (Estado: Pendiente) con soporte para metadatos Mendeley.
*   `PATCH /resources/{id}`: Actualización de metadatos académicos del recurso (Admin).
*   `GET /resources/pending`: Listado para revisión administrativa.
*   `PATCH /resources/{id}/approve`: Aprobación y publicación oficial.
*   `PATCH /resources/{id}/observe`: Devolución con comentarios técnicos.
*   `POST /resources/{id}/view`: Incrementa contador de visualizaciones.
*   `POST /resources/{id}/download`: Incrementa contador de descargas.
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

### 2. Listado de Recursos (`GET /resources`)
*   **Query Params:**
    *   `search` (opcional): Búsqueda por título o resumen.
    *   `tipo_recurso_id` (opcional): Filtro por tipo de recurso.
    *   `skip` (default: 0): Paginación.
    *   `limit` (default: 20): Tamaño de página.
*   **Response Body (200 OK):**
    ```json
    [
      {
        "id": 1,
        "titulo": "Balance de Materia y Energía",
        "resumen": "Guía completa de balances en procesos químicos...",
        "url_archivo": "https://ejemplo.com/balance.pdf",
        "archivo_size": 2500000,
        "archivo_mime": "application/pdf",
        "tipo_recurso_id": 1,
        "estado_id": 2,
        "subido_por": 1,
        "visualizaciones": 146,
        "descargas": 90,
        "created_at": "2026-05-15T10:30:00Z",
        "tipo_recurso_nombre": "Libro",
        "curso_nombre": "Química General",
        "autores": "Moran J., Pérez L.",
        "editorial": "FIQ-UNCP",
        "doi": "10.1016/j.env.2026",
        "anio": 2026
      }
    ]
    ```

### 3. Tipos de Recurso (`GET /resources/types`)
*   **Response Body (200 OK):**
    ```json
    [
      { "id": 1, "nombre": "Libro" },
      { "id": 2, "nombre": "Apunte" },
      { "id": 3, "nombre": "Guía de laboratorio" },
      { "id": 4, "nombre": "Tesis" }
    ]
    ```

### 4. Carga de Recurso (`POST /resources`)
*   **Request Body (Multipart/Form-Data):**
    *   `file`: (Archivo binario PDF, max 20MB)
    *   `titulo`: "Guía de Laboratorio de Operaciones Unitarias I"
    *   `resumen`: "Introducción práctica a los balances de materia y energía en columnas de destilación."
    *   `tipo_recurso_id`: 2 (Apunte)
    *   `curso_id`: 5 (Operaciones Unitarias I)
    *   `autores`: "Moran J., Pérez L." (Opcional, estilo Mendeley)
    *   `editorial`: "FIQ-UNCP" (Opcional, estilo Mendeley)
    *   `doi`: "10.1016/j.env.2026" (Opcional, estilo Mendeley)
    *   `anio`: 2026 (Opcional, estilo Mendeley)
*   **Response Body (201 Created):**
    ```json
    {
      "id": 1,
      "titulo": "Guía de Laboratorio de Operaciones Unitarias I",
      "url_archivo": "https://s3.amazonaws.com/fiq-bucket/resources/file.pdf",
      "archivo_size": 4120340,
      "archivo_mime": "application/pdf",
      "tipo_recurso_id": 2,
      "estado_id": 1,
      "subido_por": 1,
      "visualizaciones": 0,
      "descargas": 0,
      "created_at": "2026-06-04T16:17:40Z",
      "tipo_recurso_nombre": "Apunte",
      "curso_nombre": null,
      "autores": "Moran J., Pérez L.",
      "editorial": "FIQ-UNCP",
      "doi": "10.1016/j.env.2026",
      "anio": 2026
    }
    ```

### 5. Tracking de Visualizaciones (`POST /resources/{id}/view`)
*   **Response Body (200 OK):** Objeto `Recurso` completo con contadores actualizados.

### 6. Tracking de Descargas (`POST /resources/{id}/download`)
*   **Response Body (200 OK):** Objeto `Recurso` completo con contadores actualizados.

### 7. Edición de Metadatos del Recurso (`PATCH /resources/{id}`)
*   **Request Body (JSON):**
    ```json
    {
      "titulo": "Guía de Laboratorio de Operaciones Unitarias I (Actualizado)",
      "resumen": "Resumen actualizado de balances.",
      "tipo_recurso_id": 3,
      "curso_id": 5,
      "autores": "Moran J., Pérez L., Silva A.",
      "editorial": "Elsevier",
      "doi": "10.1016/j.env.2026",
      "anio": 2026
    }
    ```
*   **Response Body (200 OK):** Objeto `Recurso` completo con los metadatos actualizados.

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

