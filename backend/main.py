import asyncio
import contextvars
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

# Load .env before anything reads env vars (logging, auth, storage config).
load_dotenv()

# Context variable for request ID — available to any code running in the request.
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)

# ── Structured JSON logging ──────────────────────────────────────────────────


class _JSONFormatter(logging.Formatter):
    """Emit each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Attach correlation ID from context variable.
        rid = request_id_var.get("")
        if rid:
            entry["request_id"] = rid
        if record.exc_info and record.exc_info[0] is not None:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def _configure_logging() -> None:
    """Set up root logging: JSON in production, human-readable otherwise."""
    use_json = os.getenv("LOG_FORMAT", "text").strip().lower() == "json"
    level_name = os.getenv("LOG_LEVEL", "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)

    handler = logging.StreamHandler()
    if use_json:
        handler.setFormatter(_JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-8s [%(name)s] %(message)s")
        )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


_configure_logging()

logger = logging.getLogger("vitavision.access")

# Import routers — must come after load_dotenv() and logging setup
from routers import cv, storage  # noqa: E402
from auth import init_auth, verify_api_key  # noqa: E402
from limiter import limiter  # noqa: E402
from services import storage_service  # noqa: E402

# Initialise auth (reads API_KEY env var, logs warning if unset)
init_auth()


# ── Rate-limit exceeded handler (with logging) ──────────────────────────────

_rl_logger = logging.getLogger("vitavision.ratelimit")


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    client_ip = request.client.host if request.client else "unknown"
    _rl_logger.warning(
        "rate limit exceeded: %s %s from %s (limit: %s)",
        request.method,
        request.url.path,
        client_ip,
        getattr(exc, "detail", ""),
    )
    return JSONResponse(
        {"detail": "Rate limit exceeded"},
        status_code=429,
    )


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = None
    if storage_service.r2_cache_root() is not None:

        async def _cleanup_loop():
            while True:
                await asyncio.sleep(3600)
                storage_service.cleanup_stale_cache()

        task = asyncio.create_task(_cleanup_loop())
    yield
    if task:
        task.cancel()
    # Shut down the dedicated CV thread pool so worker threads are joined.
    from routers.cv._shared import cv_executor

    cv_executor.shutdown(wait=False)


_production = bool(os.getenv("API_KEY", "").strip())

app = FastAPI(
    lifespan=lifespan,
    title="Vitavision CV API",
    description="Backend for Vitavision image processing and R2 storage.",
    version="1.0.0",
    docs_url=None if _production else "/docs",
    redoc_url=None if _production else "/redoc",
    openapi_url=None if _production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)  # type: ignore[arg-type]


# ── Middleware ────────────────────────────────────────────────────────────────


@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > storage_service.max_upload_bytes():
                return JSONResponse(
                    {"detail": "Request body too large"}, status_code=413
                )
        except ValueError:
            return JSONResponse(
                {"detail": "Invalid Content-Length header"}, status_code=400
            )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    )
    return response


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Attach a correlation ID to every request for structured log tracing."""
    rid = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:12]
    request.state.request_id = rid
    token = request_id_var.set(rid)
    try:
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response
    finally:
        request_id_var.reset(token)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "%s %s %d %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ── CORS ──────────────────────────────────────────────────────────────────────

# CORS_ORIGINS: comma-separated list of allowed origins.
# Default allows local Vite dev server.
# Example for production: "https://vitavision.example.com,http://localhost:5173"
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Include routers — all routes require API key when one is configured
_auth = [Depends(verify_api_key)]
app.include_router(cv.router, prefix="/api/v1/cv", dependencies=_auth)
app.include_router(storage.router, prefix="/api/v1/storage", dependencies=_auth)


@app.get("/")
def read_root():
    return {"message": "Vitavision API is running"}
