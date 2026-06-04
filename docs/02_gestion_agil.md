# 02. Gestión Ágil del Proyecto

## 🛠 Metodología Ágil (Scrum) y Gestión en Plane

El proyecto se ejecutará bajo el marco de trabajo **Scrum**, garantizando entregas incrementales y adaptación continua. La gestión integral (Project Management) se realizará en **Plane** (plane.so), que actuará como nuestra única fuente de verdad.

*   **Estructura en Plane:**
    *   **Epics:** Agruparán grandes módulos (ej. "Sistema de Autenticación", "Gestión Bibliográfica", "Módulos de Laboratorio").
    *   **Cycles (Sprints):** Iteraciones de desarrollo de tiempo fijo (ej. 2 a 3 semanas) donde se ejecutarán tareas específicas.
    *   **Issues:** Historias de usuario, tareas técnicas y bugs. Todas deben estar estimadas (Puntos de Historia) y asignadas a un Cycle.

*   **Ceremonias:**
    *   *Sprint Planning:* Al inicio de cada Cycle para definir el *Sprint Backlog* desde Plane.
    *   *Daily Scrum:* Sincronización asíncrona mediante actualizaciones de estado en los Issues de Plane.
    *   *Sprint Review / Retrospective:* Reunión semanal (viernes 9:00 PM) para revisar entregables y bloqueos.

## 🚩 Producto Mínimo Viable (MVP)

La primera versión funcional (V1.0) se centrará en la operatividad core:
*   Autenticación de usuarios y perfiles básicos.
*   Búsqueda y visualización de documentos académicos (PDF).
*   Carga de recursos por docentes con flujo de aprobación manual por Admin.
*   Acceso a 4 módulos iniciales de laboratorio.
*   Registro de logs críticos (Inicios de sesión, lecturas, accesos a labs).

## 🧪 Historias de Usuario (Scrum)

| ID | Historia de Usuario | Criterios de Aceptación (DoD) |
| :--- | :--- | :--- |
| **HU01** | Como **estudiante**, quiero buscar recursos por tema para encontrar material rápidamente. | 1. Búsqueda por título/autor/etiqueta. 2. Paginación de resultados. 3. Uso de caché Redis. |
| **HU02** | Como **docente**, quiero subir guías y manuales para compartir material con mis alumnos. | 1. Validación de MIME y tamaño. 2. Estado inicial "Pendiente". 3. Almacenamiento UUID en S3. |
| **HU03** | Como **administrador**, quiero revisar registros de actividad para auditar el uso de la plataforma. | 1. Filtro por fecha y usuario. 2. Detalle de IP y acción. 3. Visualización de reportes. |
| **HU04** | Como **administrador**, quiero aprobar recursos subidos para garantizar la calidad académica. | 1. Listado de pendientes. 2. Previsualización del archivo. 3. Cambio de estado a "Aprobado". |

## 🏗️ Estándares (DoR / DoD)

### Definition of Ready (DoR)
1. Está redactada claramente con el formato "Como... quiero... para...".
2. Tiene Criterios de Aceptación (AC) detallados.
3. Tiene prioridad definida en el backlog.
4. Se identificaron dependencias técnicas y funcionales.

### Definition of Done (DoD)
1. Código implementado y revisado (Peer Review).
2. Pasa todas las pruebas unitarias y funcionales en Staging.
3. Cumple validaciones de seguridad (RBAC, sanitización).
4. Documentada en Swagger/OpenAPI.
5. El código sigue los estándares de estilo del proyecto.

## 📅 Cronograma por Ciclos (Cycles)

| Ciclo | Duración | Actividades Principales | Entregable |
| :--- | :--- | :--- | :--- |
| **Cycle 1** | Semanas 1-2 | Repositorio, Docker, CI/CD, Cloudflare Tunnel. | Infraestructura base lista. |
| **Cycle 2** | Semanas 3-4 | Login, JWT, Usuarios, Roles y Permisos. | Módulo de Autenticación. |
| **Cycle 3** | Semanas 5-6 | Biblioteca: API de búsqueda, filtros y UI base. | Biblioteca funcional. |
| **Cycle 4** | Semanas 7-8 | Subida de archivos segura y Object Storage. | Gestión documental completa. |
| **Cycle 5** | Semanas 9-10 | Módulos de laboratorio y trazabilidad (Logs). | Laboratorio interactivo. |
| **Cycle 6** | Semanas 11-12 | Dashboard, Pruebas E2E, Ajustes y Despliegue. | Versión Final (Release). |

---
*Este documento constituye la guía base del proyecto y podrá ser actualizado de manera controlada.*
