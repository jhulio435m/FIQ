---
name: react-frontend
description: Use when building or modifying React/TypeScript components, pages, or frontend features. Covers Tailwind v4, shadcn/ui, React Router, TanStack Query, Zustand patterns.
---

# React Frontend — FIQ Project

## Stack
- **React 19** + TypeScript 6 + Vite 8
- **Tailwind CSS v4** (CSS-based config, NOT tailwind.config.js)
- **shadcn/ui v4** (Base UI, not Radix)
- **React Router v7** (file-based via `createBrowserRouter`)
- **TanStack Query v5** for server state
- **Zustand v5** for client state
- **Axios** with JWT interceptors
- **Zod v4** for validation
- **React Hook Form** + `@hookform/resolvers` for forms

## Path aliases
- `@/` → `src/` (configured in tsconfig + vite.config)

## Component conventions
- One component per file, named export
- Props interface/type above the component
- Use `cn()` from `@/lib/utils` for className merging
- Use shadcn/ui primitives: `Button`, `Card`, `Input`, `Dialog`, `Select`, `Tabs`, `Badge`, `Skeleton`
- Icons from `lucide-react`

## Data fetching
```tsx
const { data, isLoading } = useQuery({
  queryKey: ["resources", search],
  queryFn: () => getResources({ search }),
})
```

## State
- Zustand for auth/user state only
- TanStack Query for server state (resources, labs, logs)

## Routing
All routes in `src/router.tsx` using `createBrowserRouter` with `RootLayout`.

## Colors
Use brand palette: `bg-brand-500`, `text-brand-900`, `hover:bg-brand-600`, etc.
Primary: `#ac2c2d` (brand-500)
