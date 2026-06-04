# 04. Modelo de Datos (3NF)

## 🗄️ Diseño de Base de Datos (PostgreSQL)

Modelo estrictamente normalizado hasta la Tercera Forma Normal (3NF) para garantizar la integridad y escalabilidad.

### Diagrama de Entidad-Relación (ERD)

```mermaid
erDiagram
    roles ||--o{ usuarios : "tiene"
    facultades ||--o{ cursos : "pertenece"
    tipos_recurso ||--o{ recursos : "clasifica"
    estados_recurso ||--o{ recursos : "tiene"
    usuarios ||--o{ recursos : "sube"
    cursos ||--o{ recursos : "asociado"
    
    recursos ||--o{ recurso_autor : "tiene"
    autores ||--o{ recurso_autor : "participa"
    
    recursos ||--o{ recurso_etiqueta : "tiene"
    etiquetas ||--o{ recurso_etiqueta : "asociada"
    
    recursos ||--o{ recurso_estado_historial : "registra"
    estados_recurso ||--o{ recurso_estado_historial : "anterior"
    estados_recurso ||--o{ recurso_estado_historial : "nuevo"
    usuarios ||--o{ recurso_estado_historial : "modifica"
    
    niveles_dificultad ||--o{ modulos_laboratorio : "clasifica"
    
    usuarios ||--o{ registro_actividades : "ejecuta"
    tipos_actividad ||--o{ registro_actividades : "clasifica"

    roles {
        int id PK
        varchar nombre
        text descripcion
    }
    
    usuarios {
        int id PK
        varchar nombre
        varchar email
        varchar password_hash
        int rol_id FK
        boolean esta_activo
        timestamp created_at
        timestamp updated_at
        timestamp ultimo_login
    }
    
    facultades {
        int id PK
        varchar nombre
        varchar sigla
    }
    
    cursos {
        int id PK
        varchar nombre
        varchar codigo
        int ciclo
        int facultad_id FK
        boolean esta_activo
    }
    
    tipos_recurso {
        int id PK
        varchar nombre
    }
    
    estados_recurso {
        int id PK
        varchar nombre
    }
    
    recursos {
        int id PK
        varchar titulo
        text resumen
        date fecha_publicacion
        varchar url_archivo
        int archivo_size
        varchar archivo_mime
        int tipo_recurso_id FK
        int subido_por FK
        int estado_id FK
        int curso_id FK
        int visualizaciones
        int descargas
        timestamp created_at
        timestamp updated_at
    }
    
    autores {
        int id PK
        varchar nombre_completo
    }
    
    recurso_autor {
        int recurso_id FK
        int autor_id FK
    }
    
    etiquetas {
        int id PK
        varchar nombre
    }
    
    recurso_etiqueta {
        int recurso_id FK
        int etiqueta_id FK
    }
    
    recurso_estado_historial {
        int id PK
        int recurso_id FK
        int estado_anterior_id FK
        int estado_nuevo_id FK
        text comentario
        int cambiado_por FK
        timestamp fecha_hora
    }
    
    niveles_dificultad {
        int id PK
        varchar nombre
    }
    
    modulos_laboratorio {
        int id PK
        varchar titulo
        text descripcion
        varchar url_simulacion
        int nivel_id FK
        boolean esta_activo
    }
    
    tipos_actividad {
        int id PK
        varchar nombre
    }
    
    registro_actividades {
        int id PK
        int usuario_id FK
        int tipo_actividad_id FK
        uuid entidad_relacionada_id
        timestamp fecha_hora
        inet ip_origen
        varchar user_agent
        jsonb detalle_accion
    }
```

### Detalle de Tablas y Atributos


### 1. Dominio de Usuarios (RBAC)
*   **`roles`**: `id` (PK), `nombre` (Admin, Docente, Estudiante), `descripcion`.
*   **`usuarios`**: `id` (PK), `nombre`, `email`, `password_hash`, `rol_id` (FK), `esta_activo`, `created_at`, `updated_at`, `ultimo_login`.

### 2. Dominio Académico y Bibliográfico
*   **`facultades`**: `id` (PK), `nombre`, `sigla` (ej. FIQ).
*   **`cursos`**: `id` (PK), `nombre`, `codigo`, `ciclo`, `facultad_id` (FK), `esta_activo`.
*   **`tipos_recurso`**: `id` (PK), `nombre` (Libro, Tesis, Artículo, Manual).
*   **`estados_recurso`**: `id` (PK), `nombre` (Pendiente, Aprobado, Observado, Rechazado, Archivado).
*   **`recursos`**: 
    *   `id` (PK), `titulo`, `resumen`, `fecha_publicacion`, `url_archivo`, `archivo_size`, `archivo_mime`, `tipo_recurso_id` (FK), `subido_por` (FK), `estado_id` (FK), `curso_id` (FK), `visualizaciones`, `descargas`, `created_at`, `updated_at`.
*   **`autores`**: `id` (PK), `nombre_completo`.
*   **`recurso_autor`**: `recurso_id` (FK), `autor_id` (FK).
*   **`etiquetas`**: `id` (PK), `nombre`.
*   **`recurso_etiqueta`**: `recurso_id` (FK), `etiqueta_id` (FK).
*   **`recurso_estado_historial`**: `id` (PK), `recurso_id` (FK), `estado_anterior_id` (FK), `estado_nuevo_id` (FK), `comentario`, `cambiado_por` (FK), `fecha_hora`.

### 3. Dominio de Laboratorios
*   **`niveles_dificultad`**: `id` (PK), `nombre` (Básico, Intermedio, Avanzado).
*   **`modulos_laboratorio`**: `id` (PK), `titulo`, `descripcion`, `url_simulacion`, `nivel_id` (FK), `esta_activo`.

### 4. Dominio de Trazabilidad (Auditoría Avanzada)
*   **`tipos_actividad`**: `id` (PK), `nombre`.
*   **`registro_actividades`**: `id` (PK), `usuario_id` (FK), `tipo_actividad_id` (FK), `entidad_relacionada_id` (UUID), `fecha_hora`, `ip_origen`, `user_agent`, `detalle_accion` (JSONB).

## 🔄 Flujo de Aprobación Académica

1.  **Carga (Pendiente):** El docente sube el recurso; visible solo para docente y admin.
2.  **Revisión:** El Administrador valida integridad y calidad académica.
3.  **Aprobado/Observado:** Se publica en la biblioteca o se devuelve al docente con comentarios.
