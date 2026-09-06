---
name: testing
description: Use when writing, updating, debugging, or planning FIQ tests across Vitest/RTL/MSW, Playwright E2E, Pytest backend, coverage gaps, and release quality gates.
---

# Testing — FIQ Project

Use project-specific tests first. Generic `test-master` or external skills can supply ideas, but FIQ command paths and coverage priorities below win.

## Frontend Unit and Component Tests
- Location: `frontend/src/**/*.test.tsx` or `frontend/src/**/__tests__/*.test.tsx`.
- Use Vitest + React Testing Library + `@testing-library/jest-dom`.
- Use `userEvent` for realistic interactions.
- Mock API calls with MSW when a component depends on network data.
- Prefer user-visible behavior and accessibility queries over implementation details.

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
```

## E2E Tests
- Location: `frontend/e2e/*.spec.ts`.
- Config: `frontend/playwright.config.ts`.
- Run: `npm run test:e2e` from `frontend`.
- Cover critical user flows: login, Biblioteca search/detail/counters, upload, approval, perfil, laboratorios.
- Keep tests independent; seed or mock data explicitly.

## Backend Tests
- Location: `backend/tests/`.
- Run through UV with the project dev extra.
- Use async FastAPI/httpx patterns and isolated test data.

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

## Coverage Priorities
- Auth: login, invalid credentials, invalid/expired token, protected routes.
- RBAC: Admin, Docente and Estudiante access boundaries.
- Biblioteca: search, filters, empty/error states, detail dialog, view/download counters.
- Upload: accepted files, rejected unsafe files, logging of rejected uploads.
- Admin: pending, approve, observe, user role/status changes.
- Reports: API key checks, public endpoint shapes, CSV/export helpers when changed.
- Labs: simulator calculations and registry wiring when touched.

## Commands
Frontend:

```bash
cd frontend
npm run test:unit
npm run test:coverage
npm run test:e2e
```

Backend:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

Project gates:

```bash
npm run lint
npm run build
npm run openapi:check
```

## Failure Policy
- Classify failures as product bug, stale test, flaky timing, or environment issue.
- Fix root cause, then rerun the failing test before running the broader suite.
- Do not loosen assertions just to get green.
- If a command cannot run because of local services or sandboxing, report the exact blocker and the command attempted.
