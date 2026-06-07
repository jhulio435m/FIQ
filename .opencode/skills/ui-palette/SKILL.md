---
name: ui-palette
description: Use when designing or styling UI components, pages, or themes. Covers the FIQ brand colors, typography, and design tokens.
---

# UI Palette — FIQ Brand System

Source: https://quimica.uncp.edu.pe/

## Brand colors (Tailwind v4 `@theme`)

Defined in `src/index.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#fbf4f4` | Light backgrounds |
| `brand-100` | `#f6e4e5` | Hover states on light |
| `brand-200` | `#edccd0` | Borders, subtle accents |
| `brand-300` | `#dfa6ac` | |  
| `brand-400` | `#ca757d` | |
| **`brand-500`** | **`#ac2c2d`** | **Primary — buttons, headers, links** |
| `brand-600` | `#8e2024` | Hover/active states |
| `brand-700` | `#751a1e` | Dark text on light bg |
| `brand-800` | `#63181b` | |
| `brand-900` | `#54171a` | Footer backgrounds |
| `brand-950` | `#2e0a0c` | |

## How to use in code
```tsx
<button className="bg-brand-500 hover:bg-brand-600 text-white">
<header className="bg-brand-500 text-white">
<footer className="bg-brand-900 text-brand-200">
<Card className="border-brand-200">
<h2 className="text-brand-700">
```

## Animations
- `animate-fade-in` — appear with slide-up
- `animate-fade-in-scale` — appear with scale
- `animate-fade-in-slow` — slow fade

## Typography
- Font: Geist Variable (via `@fontsource-variable/geist`)
- Sizes: Tailwind defaults (`text-sm`, `text-lg`, `text-3xl`, etc.)
- Use `font-sans` (default), `font-mono` for code

## Dark mode
- Class-based via `dark` class on `<html>`
- shadcn/ui CSS variables handle dark automatically
- Use `dark:` prefix for overrides
