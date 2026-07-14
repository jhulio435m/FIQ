# 09. Seguridad de Uploads

## Politica

Solo se aceptan PDFs academicos. La validacion ocurre en backend antes de guardar binario o metadatos.

| Control | Implementacion |
| :--- | :--- |
| Allowlist extension | Extension unica `.pdf`. |
| MIME | `application/pdf`, `application/x-pdf`. |
| Magic number | Contenido inicia con `%PDF`. |
| Integridad minima | `%%EOF` presente al final del archivo. |
| Tamano | `MAX_UPLOAD_SIZE`. |
| Nombre | Rechaza traversal y doble extension; sanea nombre antes de object storage. |
| Persistencia | No crea `Recurso` si falla validacion. |
| Auditoria | `upload` y `upload_rejected` con motivo. |
| Permisos | `Docente` o `Admin`; `401` sin token, `403` rol incorrecto. |

## Casos cubiertos por Pytest

- MIME invalido.
- `Content-Type` falso con contenido no PDF.
- Magic number invalido.
- Extension falsa y doble extension.
- PDF corrupto o incompleto.
- Archivo vacio.
- Archivo excede limite.
- Nombre peligroso con traversal.
- Upload sin autenticacion.
- Upload con rol estudiante.
- Direct upload invalido antes de crear metadatos.
- No guardar archivo ni metadata ante rechazo.
- No exponer rutas internas en respuestas.

## Riesgos Operativos

- `POST /resources/init-upload` valida metadatos, pero no puede validar magic number porque el binario se sube directo a S3; debe complementarse con validacion posterior si se habilita como flujo principal.
