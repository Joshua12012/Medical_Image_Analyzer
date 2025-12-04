# Stage 1: Builder (install dependencies with tools)
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system deps for native Python packages (e.g., if requirements have C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements (caches this layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime (slim image, no build tools)
FROM python:3.12-slim AS production

WORKDIR /app

# Copy installed Python deps from builder (no source code yet)
COPY --from=builder /usr/local /usr/local

# Copy app source code (including serviceAccountKey.json if it's there)
COPY . .

# Expose port
EXPOSE 8000

# Run with Uvicorn (use --reload only for dev; remove for prod)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]