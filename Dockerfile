FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    PATH="/root/.cargo/bin:$PATH"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Run collectstatic
RUN SECRET_KEY=dummy DATABASE_URL=sqlite:///:memory: uv run python manage.py collectstatic --noinput

EXPOSE 8079

# Run with django-hurricane (Granian ASGI/WSGI server with liveness/readiness probes, metrics, auto-migrations)
CMD ["uv", "run", "python", "manage.py", "serve", "--port", "8079", "--static", "--check-migrations-apply"]
