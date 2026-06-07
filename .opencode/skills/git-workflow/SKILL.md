---
name: git-workflow
description: Use when committing, branching, reviewing PRs, or managing git workflow. Covers conventional commits, branch naming, PR standards.
---

# Git Workflow — FIQ Project

## Branch naming
- `feat/<desc>` — New features
- `fix/<desc>` — Bug fixes
- `refactor/<desc>` — Code restructuring
- `docs/<desc>` — Documentation
- `chore/<desc>` — Tooling, CI, dependencies

## Commit convention (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`
Scopes: `api`, `ui`, `db`, `auth`, `infra`, `deps`

Examples:
```
feat(api): add resource search endpoint
fix(ui): correct pagination offset on search results
refactor(db): normalize resource_tags into junction table
```

## PR standards
- Title follows conventional commit format
- Description explains what and why
- Link to related issue/story
- At least 1 reviewer approval required
- All CI checks must pass (lint, typecheck, test, build)

## Pre-commit hooks (Husky + lint-staged)
- `lint-staged` runs on staged files
- ESLint + Prettier auto-fix
- No broken code reaches the repo

## Do NOT
- Commit directly to `main` (use feature branches + PR)
- Force push to shared branches
- Commit secrets, `.env` files, or large binaries
- Use `git commit --no-verify` unless absolutely necessary
