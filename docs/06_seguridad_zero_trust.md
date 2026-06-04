# 06. Seguridad y Zero Trust

## 🛡️ Seguridad de Red (Cloudflare Zero Trust)

Implementaremos un modelo **Zero Trust** para ocultar la infraestructura de ataques públicos y gestionar identidades.

*   **Cloudflare Tunnels:** No expondremos puertos abiertos. El clúster de K8s se conecta a Cloudflare mediante un túnel cifrado saliente (`cloudflared`).
*   **Cloudflare Access:** Capa de autenticación perimetral para paneles administrativos y herramientas internas.
*   **WAF (Web Application Firewall):** Mitigación automática de ataques L7 (DDoS, SQLi, XSS) en el borde de la red.

### Flujo de Acceso Seguro (Secuencia)

```mermaid
sequenceDiagram
    actor Usuario
    participant CF as ☁️ Cloudflare Access / WAF
    participant Tunnel as 🔒 Cloudflare Tunnel
    participant Backend as ⚡ FastAPI Backend
    participant DB as 🗄️ PostgreSQL (RBAC)

    Usuario->>CF: Petición HTTPS (e.g., ver reportes)
    CF->>CF: Evalúa Reglas WAF & Autenticación Access
    alt Bloqueado por WAF / Sin sesión en Access
        CF-->>Usuario: Bloqueo de Conexión (403 Forbidden / Redirección)
    else Tráfico Limpio y Autenticado
        CF->>Tunnel: Reenvía petición (Túnel seguro saliente)
        Tunnel->>Backend: Canaliza petición al clúster K8s
        Backend->>DB: Consulta rol y estado del usuario (JWT)
        DB-->>Backend: Rol (Estudiante/Docente/Admin)
        Backend->>Backend: Valida permisos según Matriz RBAC
        alt Permisos Insuficientes
            Backend-->>Usuario: Respuesta 403 Forbidden
        else Autorizado
            Backend-->>Usuario: Retorna Recurso / Acción Exitosa (200 OK)
        end
    end
```


## 👥 Matriz de Permisos (RBAC)

| Módulo / Acción | Estudiante | Docente | Administrador |
| :--- | :---: | :---: | :---: |
| Buscar y Ver recursos | Sí | Sí | Sí |
| Subir recursos | No | Sí (Pendientes) | Sí |
| Aprobar recursos | No | No | Sí |
| Editar recursos | No | Solo propios | Sí |
| Ver Módulos de Lab | Sí | Sí | Sí |
| Ver Reportes | No | Solo de sus alumnos | Sí (Global) |
| Gestionar Usuarios | No | No | Sí |

## 🔐 Seguridad de Aplicación (Defensa en Profundidad)

*   **Sanitización de Datos:** Validación estricta con Pydantic en FastAPI para evitar inyecciones.
*   **Seguridad en Uploads:** 
    *   Verificación de **Magic Numbers** (MIME type real).
    *   Límite estricto de 20MB por archivo.
    *   Renombrado con UUIDs para evitar path traversal.
*   **Cabeceras de Seguridad:** Inyección de HSTS, CSP, X-Frame-Options y X-Content-Type-Options.
*   **Rate Limiting:** Límites de peticiones por usuario (JWT) para evitar abusos internos.
