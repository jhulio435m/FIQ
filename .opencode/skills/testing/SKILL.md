---
name: testing
description: Use when writing or modifying tests. Covers Vitest, React Testing Library, Playwright E2E, MSW, and Pytest for backend.
---

# Testing — FIQ Project

## Frontend tests

### Unit/Component tests (Vitest + RTL)
- Location: `src/**/*.test.tsx` or `src/**/__tests__/*.test.tsx`
- Use `@testing-library/react` + `@testing-library/jest-dom`
- Mock API calls with MSW handlers in `src/mocks/`

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
```

### E2E tests (Playwright)
- Location: `e2e/*.spec.ts`
- Config: `playwright.config.ts`
- Run: `npm run test:e2e`
- Covers critical user flows (login, search, upload)

## Backend tests (Pytest)
- Location: `backend/tests/`
- Run: `pytest` (or `uv run pytest`)
- Use `httpx.AsyncClient` with FastAPI's `TestClient`
- Test DB: use a separate test database or SQLite in-memory

## MSW (Mock Service Worker)
- Handlers in `src/mocks/handlers.ts`
- Browser worker in `src/mocks/browser.ts`
- Start in tests before rendering components

## Coverage goals
- Critical paths: auth flow, resource search, upload, approval
- Error states: 401, 403, 404, 422, network errors
- Empty states: no results, no resources
