import logging
import os
import time

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("vitavision.access")

# Load env vars before importing modules that read env at import time.
load_dotenv()

# Import routers
from routers import cv, storage
from auth import init_auth, verify_api_key
from limiter import limiter
from services import storage_service

# Initialise auth (reads API_KEY env var, logs warning if unset)
init_auth()

app = FastAPI(
    title="Vitavision CV API",
    description="Backend for Vitavision image processing and R2 storage.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > storage_service.max_upload_bytes():
        return JSONResponse({"detail": "Request body too large"}, status_code=413)
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


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

# CORS_ORIGINS: comma-separated list of allowed origins.
# Default allows local Vite dev server.
# Example for production: "https://vitavision.example.com,http://localhost:5173"
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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
