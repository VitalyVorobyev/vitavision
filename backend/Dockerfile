### Stage 1: build wheels that need a compiler (calib-targets → Rust/PyO3)
FROM python:3.12.9-slim-bookworm AS builder

COPY --from=ghcr.io/astral-sh/uv:0.9.2 /uv /usr/local/bin/uv

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl pkg-config && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal && \
    rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

### Stage 2: slim runtime image
FROM python:3.12.9-slim-bookworm

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY . .

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN mkdir -p /app/local_storage && chown -R appuser:appgroup /app/local_storage

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
