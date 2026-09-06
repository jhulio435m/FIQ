---
name: security-review-fiq
description: Use when reviewing or implementing FIQ security: JWT auth, refresh/access tokens, RBAC roles, uploads, external catalog imports, reports API keys, CORS, S3/MinIO, Mongo/Redis, dependency/secrets checks, and production hardening.
---

# Security Review — FIQ Project

Use this skill for security-sensitive work. Generic security skills can provide extra checklists, but this file defines the FIQ-specific baseline.

## Scope
- Auth: JWT access/refresh tokens, FastAPI Users integration, password hashing, protected routes.
- Authorization: RBAC roles `Admin`, `Docente`, `Estudiante`.
- Files: resource upload, safe filename, MIME/extension/size validation, MinIO/S3 paths.
- Data: PostgreSQL records, Mongo event/cache data, Redis cache/session-adjacent data.
- Public surfaces: Biblioteca approved resources, reports public endpoints, Looker Studio endpoints.
- Config: `.env`, Compose env vars, CORS origins, API keys, secrets and logs.

## Review Workflow
1. Map the touched route/page/service and identify trust boundaries.
2. Check authentication first, then authorization, then input validation.
3. Inspect upload and external-input paths for unsafe filenames, content-type trust, path traversal, large payloads and source spoofing.
4. Confirm responses do not leak password hashes, tokens, internal file paths, stack traces, S3 credentials, API keys or unapproved resources.
5. Run relevant tests/scans and report exact files/lines for findings.

## Required Checks
- `401` for missing/invalid auth; `403` for valid user without required role.
- Admin-only routes use `require_role("Admin")` or the established equivalent.
- Docente/Admin upload routes do not trust client-provided metadata without server validation.
- SQL uses ORM/parameterized expressions; no string-built SQL from user input.
- CORS origins are explicit. Do not use wildcard origins with credentials.
- Logs redact passwords, tokens, API keys, S3 secrets and raw authorization headers.
- Report/dashboard API key checks fail closed.
- External catalog data is treated as untrusted and normalized before import.
- Rate limiting or abuse controls are considered for auth, upload, search and external catalog endpoints.

## Commands
```bash
npm run openapi:check
```

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

```bash
cd frontend
npm run test:unit
npm run build
```

Use `npm audit`, `gitleaks`, `bandit`, `semgrep` or container scanners when the task is an explicit security review and those tools are available.

## Output
Lead with findings, ordered by severity. Include file/line, impact, remediation and verification performed. If no issues are found, say that and name residual test gaps.
