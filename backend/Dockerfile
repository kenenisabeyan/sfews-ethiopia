# Use a lightweight Python base image
FROM python:3.12-slim

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disk
# PYTHONUNBUFFERED: Ensures Python output is sent straight to terminal (logs) without being buffered
# PATH: Prepend the uv virtual environment path so that we can run `uvicorn` directly
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Install `uv` directly from the official astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set the working directory inside the container
WORKDIR /app

# Copy ONLY the dependency definition files first
# This ensures Docker caches the dependency installation step
COPY pyproject.toml uv.lock* ./

# Install dependencies using `uv`
# (Uses --frozen if a lockfile exists, otherwise just installs from pyproject.toml)
RUN uv sync --frozen || uv sync

# Now copy the rest of the application code
COPY . .

# Expose port (Render sets the PORT environment variable dynamically, but typically uses 10000 or similar)
EXPOSE 8000

# Start Uvicorn server, binding to 0.0.0.0 and the PORT env var (with a fallback to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
