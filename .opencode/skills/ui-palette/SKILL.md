---
name: ui-palette
description: Use when designing, styling, or reviewing FIQ UI surfaces, institutional colors, typography, Tailwind v4 tokens, responsive layouts, contrast, and dense app workflows.
---

# UI Palette — FIQ Brand System

Source: https://quimica.uncp.edu.pe/

## Brand Colors
Defined in `frontend/src/index.css` as Tailwind v4 `@theme` tokens.

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#fbf4f4` | Light backgrounds |
| `brand-100` | `#f6e4e5` | Hover states on light |
| `brand-200` | `#edccd0` | Borders, subtle accents |
| `brand-300` | `#dfa6ac` | Supporting accent |
| `brand-400` | `#ca757d` | Supporting accent |
| `brand-500` | `#ac2c2d` | Primary buttons, headers, links |
| `brand-600` | `#8e2024` | Hover/active states |
| `brand-700` | `#751a1e` | Dark text on light background |
| `brand-800` | `#63181b` | Strong surfaces |
| `brand-900` | `#54171a` | Footer/dark surfaces |
| `brand-950` | `#2e0a0c` | Highest contrast dark |

## Usage
```tsx
<button className="bg-brand-500 hover:bg-brand-600 text-white">
<header className="bg-brand-500 text-white">
<footer className="bg-brand-900 text-brand-200">
<Card className="border-brand-200">
<h2 className="text-brand-700">
```

## Product Surface Guidance
- FIQ is an institutional operations app, not a marketing landing page. Prefer dense, quiet, scannable layouts.
- Use cards for repeated resources or framed tools; avoid cards inside cards.
- Biblioteca cards stay compact with icon, badge, file metadata, views/downloads and clear actions.
- Admin views prioritize tables, filters, status badges and destructive-action confirmation.
- Labs can be more visual, but simulator controls must remain stable and readable.

## Typography and Motion
- Font: Geist Variable via `@fontsource-variable/geist`.
- Use Tailwind default sizes; do not scale font size with viewport width.
- Use `font-sans` by default and `font-mono` only for code/data.
- Existing animations: `animate-fade-in`, `animate-fade-in-scale`, `animate-fade-in-slow`.
- Motion should clarify state changes; avoid decorative animation in dense admin flows.

## Responsive and Accessibility Rules
- Mobile Biblioteca filters use a sheet/overlay; desktop uses lateral facets.
- Text must not overflow buttons, badges, cards, dialogs or table cells.
- Every icon-only button needs an accessible name and tooltip when meaning is not obvious.
- Color cannot be the only state indicator; pair status colors with labels/icons.
- Check contrast for `brand-*` combinations, especially in dark mode.

## Color Discipline
- Primary actions: `bg-brand-500 hover:bg-brand-600 text-white`.
- Secondary surfaces: neutral backgrounds with brand accents, not red-tinted everything.
- Error/destructive states should use semantic destructive tokens when available, not institutional red if that causes ambiguity.
- Avoid one-note palettes; combine brand red with neutral surfaces and limited functional color.
