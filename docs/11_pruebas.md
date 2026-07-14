# 11. Pruebas

## Backend

Comando:

```bash
cd backend
UV_CACHE_DIR=/tmp/fiq-uv-cache uv run --extra dev pytest
```

Cobertura actual:

- Healthcheck.
- Login correcto e invalido.
- Busqueda publica y tipos.
- Moderacion admin.
- Archivado logico.
- Upload positivo docente.
- Pruebas negativas de seguridad para uploads.
- Permisos `401/403`.

## Frontend Unitario

Comando:

```bash
cd frontend
npm run test:unit
```

Stack:

- Vitest.
- React Testing Library.
- jest-dom.
- MSW configurado en `src/test/server.ts`.
- Helpers de providers en `src/test/render.tsx`.

Cobertura inicial:

- Login success/error.
- ResourceGrid loading/empty/success.
- Biblioteca busqueda/filtros/empty.
- UploadDialog validacion.
- Admin reportes/error/export.
- ProtectedRoute por rol.
- Laboratorios estructura educativa.

## E2E

Comando:

```bash
cd frontend
npx playwright test
```

En Arch, `npx playwright install --with-deps` no instala dependencias del sistema porque intenta usar `apt-get`. Instalar navegadores con `npx playwright install` y resolver librerias del sistema con el gestor de paquetes local.
