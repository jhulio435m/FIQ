---
title: "PRESUPUESTO TÉCNICO DETALLADO: PROYECTO FIQ-DIGITAL"
author: "Equipo de Ingeniería de Software e Implementación - UNCP"
date: "4 de junio de 2026"
geometry: margin=1in
fontsize: 10pt
---

## 1. RESUMEN DE LA INVERSIÓN
El presente presupuesto detalla los recursos técnicos y especializados necesarios para la entrega de una plataforma de alta disponibilidad y seguridad perimetral para la Facultad de Ingeniería Química.

| Código | Categoría | Componentes Incluidos | Monto (S/.) |
| :--- | :--- | :--- | :---: |
| **ENG-01** | **Ingeniería de Software** | Backend FastAPI, Frontend React, Modelado 3NF, APIs. | 4,500.00 |
| **OPS-02** | **Infraestructura y DevOps** | Kubernetes, Docker, CI/CD, Cloudflare Zero Trust. | 2,500.00 |
| **DATA-03** | **Gestión y Migración de Datos** | Digitalización, Normalización, Carga Masiva y Auditoría. | 1,500.00 |
| **QA-04** | **Calidad y Puesta en Marcha** | Pruebas de Estrés, Manuales, Capacitación y Soporte. | 1,500.00 |
| **TOTAL** | | | **10,000.00** |

## 2. CRONOGRAMA DE PAGOS Y ENTREGABLES (HITOS)

| Hito | % | Entregable Técnico | Monto (S/.) |
| :--- | :---: | :--- | :---: |
| **01. Inicio** | 30% | Acta de Inicio, Configuración de Monorepo, Pipeline CI/CD base. | 3,000.00 |
| **02. MVP** | 40% | Módulo Autenticación, Biblioteca Operativa, Carga inicial de datos. | 4,000.00 |
| **03. Cierre** | 30% | Simuladores de Lab, Dashboard, Manuales y Conformidad Final. | 3,000.00 |

## 3. DESGLOSE TÉCNICO GRANULAR

### 3.1 Ingeniería de Software (Backend & Frontend) - S/. 4,500.00
*   **Desarrollo de API Core (FastAPI):** Implementación de Arquitectura por Capas (Routers, Services, Repositories).
*   **Modelado de Datos 3NF:** Diseño e implementación de base de datos relacional PostgreSQL con integridad referencial absoluta.
*   **Seguridad Aplicativa:** Implementación de autenticación JWT (JSON Web Tokens), Refresh Tokens y control de acceso basado en roles (RBAC).
*   **Interfaz de Usuario (React):** Desarrollo de componentes modulares, ruteo protegido, y visualizadores interactivos de documentos PDF.
*   **Integración de Caché (Redis):** Configuración de capa de memoria para optimizar búsquedas masivas y reducir la latencia de la base de datos.

### 3.2 Infraestructura, DevOps y Ciberseguridad - S/. 2,500.00
*   **Contenerización (Docker):** Creación de imágenes optimizadas de múltiples etapas (Multi-stage builds) para Backend y Frontend.
*   **Orquestación (Kubernetes):** Configuración de manifiestos (Deployments, Services, ConfigMaps, Secrets) y auto-escalado horizontal (HPA) al 70% de carga.
*   **Red Segura (Cloudflare Zero Trust):** Configuración de Cloudflare Tunnels (ocultamiento de infraestructura) y Cloudflare Access (Identity-Aware Proxy).
*   **Hardening de Red:** Implementación de WAF (Web Application Firewall) para mitigación de ataques SQL Injection, XSS y protección contra DDoS.
*   **Automatización (CI/CD):** Configuración de GitHub Actions para despliegue automatizado sin caída del servicio (Zero-downtime rolling updates).

### 3.3 Gestión de Datos e Implementación Académica - S/. 1,500.00
*   **Normalización Académica:** Clasificación de recursos por Facultades, Cursos (Sílabos) y Semestres.
*   **Carga Masiva y Digitalización:** Procesamiento inicial de más de 100 documentos, validación de integridad y carga hacia Object Storage.
*   **Sistema de Auditoría Proactiva:** Implementación de registro de trazas detalladas (IP de origen, User Agent, Historial de cambios de estado).
*   **Flujo de Aprobación Académica:** Programación de estados de recurso (Pendiente, Aprobado, Observado) con log de motivos.

### 3.4 Aseguramiento de Calidad (QA) y Soporte - S/. 1,500.00
*   **Pruebas Funcionales:** Ejecución de 27 Historias de Usuario verificadas contra Criterios de Aceptación.
*   **Pruebas de Rendimiento:** Validación de tiempos de respuesta menores a 2 segundos mediante herramientas de benchmarking.
*   **Documentación de Ingeniería:** Entrega de documentación técnica (OpenAPI/Swagger), diagramas de arquitectura y esquema de base de datos.
*   **Transferencia de Capacidades:** Sesiones de formación técnica para administradores y formación funcional para docentes/estudiantes.
*   **Plan de Recuperación ante Desastres (DRP):** Configuración de copias de seguridad automáticas y políticas de retención de 30 días.
