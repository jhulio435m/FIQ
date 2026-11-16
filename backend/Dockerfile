# syntax=docker/dockerfile:1.7
# ---- build: resuelve dependencias exactamente desde uv.lock (lo mismo que corre CI) ----
FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:0.11.19 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ---- runtime: sin toolchain, usuario sin privilegios ----
FROM python:3.13-slim AS runtime

RUN groupadd --system --gid 10001 fiq \
    && useradd --system --uid 10001 --gid fiq --home-dir /app --shell /usr/sbin/nologin fiq

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    LOG_JSON=true \
    WEB_CONCURRENCY=2

WORKDIR /app
COPY --from=build /opt/venv /opt/venv
COPY --chown=fiq:fiq alembic.ini ./
COPY --chown=fiq:fiq alembic ./alembic
COPY --chown=fiq:fiq app ./app

USER fiq
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1

# --proxy-headers: la IP real (rate limiting, auditoría) llega vía nginx/cloudflared.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*' --workers ${WEB_CONCURRENCY} --no-server-header"]
