# FIQ — Plataforma Digital Facultad de Ingeniería Química UNCP

## Stack
- **Frontend:** React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + shadcn/ui v4
- **Backend:** FastAPI + SQLAlchemy 2.0 + PostgreSQL 17 + Redis 7
- **Auth:** JWT (access + refresh tokens) + RBAC (Admin/Docente/Estudiante)
- **Infra:** Docker Compose (dev) → Kubernetes (prod) + Cloudflare Tunnel
- **Testing:** Vitest + RTL (unit), Playwright (E2E), Pytest (backend)
- **Deps:** UV (Python), npm (Node)

## Prohibido
- No editar migraciones de Alembic después de commiteadas
- No pushear a `main` directo, usar PRs
- No subir secretos, `.env` o binarios grandes
- No usar `any` en TypeScript
- No comentarios genéricos tipo `// TODO` sin contexto

## Layout (Backend)
```
backend/
├── app/
│   ├── core/        # Config, DB, Security, Dependencies
│   ├── api/
│   │   ├── users/   # Router → Service → CRUD → Models → Schemas
│   │   ├── resources/
│   │   ├── labs/
│   │   └── auth/
│   ├── logs/
│   └── reports/
├── alembic/
├── Dockerfile
├── pyproject.toml   # UV-managed
└── .env.example
```

## Layout (Frontend)
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/       # shadcn/ui primitives
│   │   ├── layout/   # Header, Footer, RootLayout
│   │   └── library/  # SearchBar, ResourceCard, etc.
│   ├── pages/        # One folder per route
│   ├── services/     # API clients (Axios)
│   ├── stores/       # Zustand
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilities (cn, etc.)
│   └── theme/        # colors.ts
├── e2e/              # Playwright tests
├── Dockerfile
└── nginx.conf
```

## Eventos en consola
- `build:dev` → frontend: `npm run dev`
- `build:prod` → root: `npm run build`

## Colores
Primario: brand-500 #ac2c2d (rojo institucional FIQ)
Usar bg-brand-500, text-brand-700, hover:bg-brand-600, etc.

## Endpoints activos
- `POST /auth/login` — login JWT (access + refresh)
- `GET /resources/types` — tipos de recurso (dinámico)
- `GET /resources` — lista recursos aprobados (search, tipo_recurso_id)
- `POST /resources/{id}/view` — incrementa vistas
- `POST /resources/{id}/download` — incrementa descargas
- `POST /resources` — upload multipart (requiere auth Docente/Admin)
- `GET /resources/pending` — pendientes (Admin)
- `PATCH /resources/{id}/approve` — aprobar recurso (Admin)
- `PATCH /resources/{id}/observe` — observar recurso (Admin)

## Biblioteca (UI)
- Search sticky con debounce 400ms
- Facetas laterales: Tipo de Recurso + Curso
- Sidebar mobile con overlay
- Cards compactos con icono por tipo, badge, tamaño, vistas/descargas
- Detalle en dialog con tracking de vista automático
- Contadores de vistas y descargas funcionales

## Gestión de dependencias
- **Raíz (`package.json`)**: dev tooling — husky, commitlint, lint-staged. Hooks en `.husky/`.
- **Frontend (`frontend/package.json`)**: app deps — React, TanStack Query, Zustand, shadcn/ui, framer-motion, Recharts, TanStack Table, date-fns, sonner, react-dropzone, vaul.
- **Backend (`backend/pyproject.toml`)**: FastAPI, SQLAlchemy 2.0, Alembic, UV.

## Skills de IA disponibles
| Origen | Cantidad | Path en opencode.json |
|--------|----------|-----------------------|
| Propios del proyecto | 6 + 8 (copiados) | `.opencode/skills` |
| Gentleman-Skills (curated) | 15 | `.opencode/skills-collections/gentleman-skills/curated` |
| farmage/opencode-skills | 66 skills + 9 workflows | `.opencode/skills-collections/opencode-skills/skills` |
| opencode-skills-collection (npm plugin) | 1000+ | auto-sync via plugin |

## Git quality gates (husky hooks)
- **pre-commit**: `lint-staged` (ESLint en staged .ts/.tsx)
- **commit-msg**: `commitlint` (Conventional Commits: `type(scope): message`)
- Usar npx husky add para nuevos hooks si es necesario.
