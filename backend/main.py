import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Import routers
from routers import cv, storage
from auth import init_auth, verify_api_key
from limiter import limiter

# Load env vars
load_dotenv()

# Initialise auth (reads API_KEY env var, logs warning if unset)
init_auth()

app = FastAPI(
    title="Vitavision CV API",
    description="Backend for Vitavision image processing and R2 storage.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS_ORIGINS: comma-separated list of allowed origins.
# Default allows local Vite dev server.
# Example for production: "https://vitavision.example.com,http://localhost:5173"
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — all routes require API key when one is configured
_auth = [Depends(verify_api_key)]
app.include_router(cv.router, prefix="/api/v1/cv", dependencies=_auth)
app.include_router(storage.router, prefix="/api/v1/storage", dependencies=_auth)

@app.get("/")
def read_root():
    return {"message": "Vitavision API is running"}
