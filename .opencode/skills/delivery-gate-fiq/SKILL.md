---
name: delivery-gate-fiq
description: Use before declaring FIQ work complete, preparing a PR, finishing a feature, deployment, bug fix, security hardening, QA pass, or production-readiness review.
---

# Delivery Gate — FIQ Project

Use this as the final close-out checklist. Match the gate to the change size; do not run irrelevant expensive checks for documentation-only edits.

## Baseline
- Stay in `/home/blink/documents/projects/FIQ`.
- Do not modify unrelated dirty files.
- Do not edit committed Alembic migrations.
- Do not commit secrets, `.env`, generated reports, large binaries or local cache files.
- Prefer project skills in `.opencode/skills` over generic collection skills.

## Code Gates
Frontend:

```bash
npm run lint
npm run build
cd frontend
npm run test:unit
```

Backend:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

API contract:

```bash
npm run openapi:check
```

E2E, when user workflows changed:

```bash
cd frontend
npm run test:e2e
```

Docker/runtime, when infra or integration changed:

```bash
docker compose up --build
```

Then verify actual health endpoints/UI paths instead of relying only on container status.

## Functional Gates
- Auth/RBAC: Admin, Docente and Estudiante access behaves as expected.
- Biblioteca: search, filters, detail dialog, view/download counters and empty/error states work.
- Upload: invalid files are rejected and valid files are tracked.
- Admin: pending, approve, observe and user-management flows still work.
- Labs: simulator registry and calculations remain isolated.
- Reports: public/API-key-protected endpoints return expected shapes.

## Final Response
Report:
- Files changed.
- Commands run and result.
- Commands not run and why.
- Any remaining risk or follow-up that affects correctness.
