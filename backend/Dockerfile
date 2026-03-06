FROM python:3.12.9-slim-bookworm

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.9.2 /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first (layer cached separately from source)
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application source
COPY . .

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

RUN mkdir -p /app/local_storage && chown -R appuser:appgroup /app/local_storage

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
