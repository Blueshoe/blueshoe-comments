FROM python:3.12-slim

# Install Astral uv directly from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (reproducible via uv.lock)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Run collectstatic
RUN SECRET_KEY=dummy DATABASE_URL=sqlite:///:memory: python manage.py collectstatic --noinput

EXPOSE 8079

# Run with django-hurricane (Granian ASGI/WSGI server with liveness/readiness probes, metrics, auto-migrations)
CMD ["python", "manage.py", "serve", "--port", "8079", "--static", "--check-migrations-apply"]
