# ==========================================
# SFEWS Command Center - Production Backend
# High-Concurrency FastAPI + Gunicorn Worker Cluster
# ==========================================

FROM python:3.12-slim

# Prevent bytecode write & ensure unbuffered stdout for container log streams
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Install curl for container orchestration health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install astral-sh/uv for ultra-fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Cache dependencies layer
COPY pyproject.toml uv.lock* ./

# Install dependencies into container virtual environment
RUN uv sync --frozen || uv sync

# Copy application sources and configurations
COPY . .

# Expose API port
EXPOSE 8000

# Docker / Kubernetes Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/ || exit 1

# Production Entrypoint: Gunicorn ASGI Cluster with Uvicorn fallback
CMD ["sh", "-c", "if command -v gunicorn > /dev/null 2>&1; then gunicorn -c gunicorn_conf.py app.main:app; else uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}; fi"]
