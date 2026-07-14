# 10. Roles y Permisos

| Accion | Admin | Docente | Estudiante |
| :--- | :---: | :---: | :---: |
| Ver catalogo | Si | Si | Si |
| Ver detalle recurso | Si | Si | Si |
| Descargar recurso | Si | Si | Si autenticado |
| Subir PDF | Si | Si | No |
| Aprobar/observar recurso | Si | No | No |
| Editar metadatos | Si | No | No |
| Archivar recurso | Si | No | No |
| Ver reportes | Si | No | No |
| Ver auditoria | Si | No | No |
| Gestionar usuarios | Si | No | No |
| Acceder a laboratorios | Si | Si | Si |

El backend aplica RBAC con `require_role`. El frontend solo oculta o redirige UI; no se considera fuente de autorizacion.
