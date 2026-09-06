---
name: playwright
description: >
  FIQ Playwright E2E testing patterns. Trigger when writing or debugging frontend/e2e flows for login,
  Biblioteca, recursos, perfil, laboratorios, admin, responsive behavior, or browser regressions.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1-fiq"
---

# Playwright — FIQ Project

## Locations
- Specs live in `frontend/e2e/*.spec.ts`.
- Config lives in `frontend/playwright.config.ts`.
- Run from `frontend` with `npm run test:e2e`.
- Prefer extending the existing specs before introducing a new folder or Page Object layer.

## Browser Exploration Workflow
If Playwright/browser tools are available, inspect the real page before writing or changing tests:

1. Navigate to the target page.
2. Snapshot the page structure and accessible names.
3. Interact with forms/elements to verify the real flow.
4. Capture screenshots for expected states when useful.
5. Verify transitions through loading, success and error states.
6. Use the observed selectors and labels in the test.

## Selector Priority
```typescript
page.getByRole("button", { name: "Ingresar" })
page.getByRole("link", { name: "Biblioteca" })
page.getByLabel("Correo institucional")
page.getByText("Sin resultados")
page.getByTestId("resource-card")
```

- Prefer role/name and label selectors.
- Use text selectors for static user-visible content.
- Use `data-testid` only when semantic selectors are impossible or a composed control has no reliable accessible name.
- Avoid CSS class selectors, `nth()` and `first()` unless the UI is genuinely positional.

## FIQ Critical Flows
- Login success/failure and protected route redirects.
- Biblioteca search debounce, filters, detail dialog, view/download tracking.
- Resource upload validation and teacher/admin access.
- Pending resource approval/observation for Admin.
- Perfil auth state and user-visible account data.
- Laboratorios navigation and simulator availability.

## Stability Rules
- Do not use arbitrary `waitForTimeout()`.
- Wait for user-visible outcomes, URL changes, network responses, or role/name selectors.
- Keep each test independent and reset auth/storage between tests unless a shared fixture is explicit.
- Capture traces/screenshots on failure through Playwright config, not ad hoc screenshots in every test.
- Repeat a flaky test locally before declaring it fixed:

```bash
cd frontend
npm run test:e2e -- --repeat-each=5 e2e/<file>.spec.ts
```

## Scope Rule
- If the user asks for one test, add one `test()` to the relevant existing spec.
- If the user asks for a suite or comprehensive coverage, cover happy path, auth/role failure, validation failure, empty state and one mobile/responsive path when relevant.
