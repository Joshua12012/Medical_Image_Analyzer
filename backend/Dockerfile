# ---------- STAGE 1: Base ----------
FROM python:3.12-slim AS base

# Set work directory
WORKDIR /app

# Install system dependencies (optional, if needed for your packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (speeds up rebuilds)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Expose port
EXPOSE 8000

# Run Uvicorn server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
