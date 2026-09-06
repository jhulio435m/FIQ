---
name: react-frontend
description: Use when building or modifying FIQ React/Vite frontend components, pages, services, hooks, stores, Biblioteca/Admin/Labs UI, TanStack Query flows, forms, accessibility, and tests.
---

# React Frontend — FIQ Project

## Stack
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 with CSS-based config, not `tailwind.config.js`
- shadcn/ui v4 using Base UI
- React Router v7 through `src/router.tsx`
- TanStack Query v5 for server state
- Zustand v5 for auth/user client state
- Axios with JWT interceptors
- Zod v4 + React Hook Form for forms

Do not apply Next.js or Server Component guidance from generic skills here. This app is Vite + React Router.

## Component Rules
- Path alias: `@/` maps to `src/`.
- One component per file, named export.
- Props interface/type lives above the component.
- Use `cn()` from `@/lib/utils`.
- Use shadcn/ui primitives and `lucide-react` icons.
- No `any`; use `unknown`, Zod schemas, discriminated unions, or explicit API types.
- Pages compose data hooks/services plus focused UI components.

## Data and State
```tsx
const { data, isLoading } = useQuery({
  queryKey: ["resources", search],
  queryFn: () => getResources({ search }),
})
```

- Query keys include all filters/search params that affect the response.
- Mutations that change resources, counters, users or approvals invalidate affected queries.
- Do not duplicate server state in Zustand.
- Keep auth/user identity in Zustand.

## FIQ UX Rules
- Biblioteca: preserve sticky debounced search, lateral facets, mobile overlay, compact resource cards, detail dialog, and functional view/download counters.
- Admin: optimize for dense scanning, table/action clarity, role/status feedback, and guarded actions.
- Labs: keep simulator modules isolated through the registry/calculation pattern; do not add unrelated simulators while refactoring.
- Every async surface needs loading, empty and error states.
- Use semantic HTML, accessible labels, focus states, keyboard-operable dialogs/sheets, and sufficient contrast.

## Styling
- Use brand palette: `bg-brand-500`, `text-brand-900`, `hover:bg-brand-600`.
- Primary: `#ac2c2d` (`brand-500`).
- Avoid making whole screens red-tinted; use neutral surfaces with brand accents.

## Verification
Use the narrowest command that covers the edit:

```bash
cd frontend
npm run lint
npm run test:unit
npm run build
```

For user workflows, add/update `frontend/e2e/*.spec.ts` and run:

```bash
cd frontend
npm run test:e2e
```
