# 01. Contexto del Proyecto

## 🎯 Alcance del Proyecto

Este proyecto comprende el diseño, desarrollo y despliegue de una plataforma digital integrada para la Facultad de Ingeniería Química de la UNCP.

**Incluye:**
*   Gestión de usuarios y control de acceso basado en roles (RBAC).
*   Biblioteca virtual con buscador avanzado y visualización de recursos académicos.
*   Módulos interactivos de laboratorio (simulaciones) organizados por niveles.
*   Registro de trazabilidad y auditoría de uso (Logs).
*   Panel administrativo para gestión de contenidos y métricas.
*   Infraestructura de alta disponibilidad (Kubernetes) y seguridad perimetral (Zero Trust).

**Fuera del alcance:**
*   Desarrollo de simuladores científicos de alta fidelidad desde cero.
*   Integración con el sistema de notas o matrícula de la universidad.
*   Pasarelas de pago o comercio electrónico.
*   Emisión de certificados digitales firmados.

## 🚀 Roles y Responsabilidades (Equipo de 3 Ejecutores)

| Nombre | Rol Scrum | Especialidad Técnica | Responsabilidades Clave |
| :--- | :--- | :--- | :--- |
| **Palomino Chacon Hernando De** | Product Owner | Backend Developer | Definir prioridades, desarrollar la API (FastAPI) y base de datos. |
| **Moran de la Cruz Jhulio Alessandro** | Scrum Master | Frontend Developer | Facilitar ceremonias y desarrollar la interfaz de usuario (React). |
| **Pando Vargas Josue Samuel** | QA / Security | DevOps Engineer | Configuración de K8s, Cloudflare, pipelines CI/CD y pruebas. |

## ✅ Indicadores de Éxito (KPIs)

| Indicador | Meta |
| :--- | :--- |
| **Recursos digitales cargados** | Mínimo 100 documentos (libros, tesis, guías). |
| **Módulos de laboratorio** | Mínimo 4 simulaciones interactivas operativas. |
| **Tiempo de respuesta (Búsqueda)** | Promedio menor a 2 segundos. |
| **Disponibilidad del sistema** | 99.9% de uptime (Kubernetes + Cloudflare). |
| **Seguridad de archivos** | 0% de archivos maliciosos subidos (Validación estricta). |
| **Capacitación** | 100% del equipo administrativo y docente formado. |

## ⚠️ Gestión de Riesgos

| Riesgo | Impacto | Plan de Mitigación |
| :--- | :--- | :--- |
| Falta de recursos iniciales | Alto | Digitalización progresiva; carga inicial mínima garantizada. |
| Vulnerabilidades en archivos | Alto | Validación de Extensión, MIME real, Magic Number y análisis de integridad. |
| Retrasos en Kubernetes | Medio | Iniciar con Docker Compose y migrar a K8s en Cycle 2. |
| Baja adopción | Medio | Manuales de usuario simplificados y sesiones de capacitación. |

## 🏁 Conclusión Ejecutiva

La propuesta plantea una plataforma escalable, segura y modular para la gestión de recursos académicos y laboratorios virtuales de la FIQ–UNCP. La arquitectura por capas, el uso de FastAPI, React, PostgreSQL, Redis, Object Storage y mecanismos de seguridad como Cloudflare Zero Trust permiten garantizar mantenibilidad, trazabilidad y disponibilidad del sistema en un entorno universitario moderno.
