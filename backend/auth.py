import hmac
import logging
import os

from fastapi import HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

logger = logging.getLogger(__name__)

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

_api_key: str | None = None


def _has_production_origins() -> bool:
    """Return True if CORS_ORIGINS contains non-localhost origins."""
    cors = os.getenv("CORS_ORIGINS", "")
    for origin in cors.split(","):
        origin = origin.strip().lower()
        if origin and "localhost" not in origin and "127.0.0.1" not in origin:
            return True
    return False


def _load_api_key() -> str | None:
    key = os.getenv("API_KEY", "").strip()
    if not key:
        if _has_production_origins():
            raise RuntimeError(
                "API_KEY is not set but CORS_ORIGINS contains production origins. "
                "Refusing to start without authentication. "
                "Set API_KEY or remove production origins from CORS_ORIGINS."
            )
        logger.warning(
            "API_KEY is not set — authentication is DISABLED. "
            "Set the API_KEY environment variable to enable it."
        )
        return None
    return key


def init_auth() -> None:
    """Call once at application startup to load and cache the API key."""
    global _api_key
    _api_key = _load_api_key()


async def verify_api_key(header_key: str | None = Security(_API_KEY_HEADER)) -> None:
    """FastAPI dependency. Enforces API key when one is configured."""
    if _api_key is None:
        # Auth disabled (no key configured — dev/local mode).
        return
    if header_key is None:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    if not hmac.compare_digest(header_key, _api_key):
        raise HTTPException(status_code=403, detail="Invalid API key")
