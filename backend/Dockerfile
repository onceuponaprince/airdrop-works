# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install dependencies (cached layer) — `--frozen` requires uv.lock + pyproject.toml
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy source
COPY . .

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Same binary as builder — enables `uv run` in CMD, docker-compose, and one-off execs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy built app + venv from builder
COPY --from=builder /app /app
COPY --from=builder /app/.venv /app/.venv

# Prefer venv tools; uv is still on PATH for `uv run …`
ENV PATH="/app/.venv/bin:/usr/local/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_ENV=production
ENV DJANGO_SETTINGS_MODULE=config.settings.production

EXPOSE 8000

# Collect static, then start gunicorn
CMD ["sh", "-c", "uv run python manage.py collectstatic --noinput && uv run gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60"]
