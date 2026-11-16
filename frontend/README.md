# FIQ — Frontend

React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui. Estado de servidor con TanStack Query, estado de sesión con Zustand.

## Comandos

```bash
npm install
npm run dev          # http://localhost:5173 (proxy /api → http://localhost:8000)
npm run lint
npm run test:unit    # Vitest + RTL + MSW
npm run test:e2e     # Playwright (requiere backend y datos de seed)
npm run build
```

## Estructura

- `src/pages/` — una carpeta por ruta (biblioteca, laboratorios, admin, perfil, login).
- `src/components/ui/` — primitives de shadcn/ui; `layout/`, `library/`, `labs/`, `admin/` — componentes de dominio.
- `src/services/` — clientes Axios. `api.ts` adjunta el access token y renueva la sesión con `/auth/refresh` (cookie HttpOnly) ante un 401.
- `src/stores/` — Zustand. `src/hooks/` — hooks de datos.

## Producción

La imagen (`Dockerfile`) compila con `VITE_API_URL` como build arg (por defecto `/api`) y sirve con `nginx-unprivileged` en el puerto 8080. `nginx.conf` añade CSP, HSTS y cache de assets, y hace proxy de `/api/` al backend.
