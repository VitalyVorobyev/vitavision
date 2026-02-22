import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import routers
from routers import cv, storage

# Load env vars
load_dotenv()

app = FastAPI(
    title="Vitavision CV API",
    description="Backend for Vitavision image processing and R2 storage.",
    version="1.0.0"
)

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

# Include routers
app.include_router(cv.router, prefix="/api/v1/cv")
app.include_router(storage.router, prefix="/api/v1/storage")

@app.get("/")
def read_root():
    return {"message": "Vitavision API is running"}
