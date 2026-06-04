# 07. Infraestructura y DevOps

## 🌐 Entornos de Despliegue

1.  **Desarrollo (Local):** Uso de `docker-compose` para orquestación local (API, DB, Redis).
2.  **Pruebas / Staging (QA):** Namespace aislado en Kubernetes para validación de entregables.
3.  **Producción:** Clúster Kubernetes de alta disponibilidad con auto-escalado (HPA) al 70% de CPU/Memoria.

## ⚙️ Tubería CI/CD (GitHub Actions)

*   **Integración Continua (CI):** Ejecución de tests (Pytest, Jest) y auditoría de seguridad en cada Pull Request.
*   **Despliegue Continuo (CD):** Construcción de imágenes Docker y actualización de manifiestos K8s mediante *Rolling Update*.

## 📊 Observabilidad y Monitoreo

*   **Logs Centralizados:** Recolección de logs de todos los pods para auditoría técnica.
*   **Métricas en Tiempo Real:** Monitoreo de latencia (<2s), errores 5XX y consumo de recursos.
*   **Alertas Automáticas:** Notificaciones ante caídas del servicio o comportamientos anómalos.

## 💾 Respaldo y Recuperación ante Desastres (DRP)

*   **PostgreSQL:** Backups diarios automatizados con retención de 30 días en S3.
*   **Object Storage (S3):** Versionamiento activo de archivos académicos.
*   **RTO/RPO:** Tiempo de recuperación estimado menor a 2 horas mediante infraestructura como código.
