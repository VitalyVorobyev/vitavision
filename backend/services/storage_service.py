import mimetypes
import os
import re
import time
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Literal, cast

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

StorageMode = Literal["r2", "local"]

DEFAULT_BUCKET = "vitavision"
DEFAULT_UPLOAD_PREFIX = "uploads"
DEFAULT_PRESIGN_EXPIRY = 300  # 5 minutes
DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def local_storage_root() -> Path:
    configured = os.getenv("LOCAL_STORAGE_ROOT")
    if configured:
        root = Path(configured)
    else:
        root = _backend_root() / "local_storage"
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def bucket_name() -> str:
    return os.getenv("S3_BUCKET", DEFAULT_BUCKET)


def presign_expiry_seconds() -> int:
    raw = os.getenv("R2_PRESIGN_EXPIRES_SECONDS")
    if not raw:
        return DEFAULT_PRESIGN_EXPIRY
    try:
        value = int(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Invalid R2_PRESIGN_EXPIRES_SECONDS"
        ) from exc
    if value <= 0:
        raise HTTPException(
            status_code=500, detail="R2_PRESIGN_EXPIRES_SECONDS must be > 0"
        )
    return value


def max_upload_bytes() -> int:
    raw = os.getenv("MAX_UPLOAD_BYTES")
    if not raw:
        return DEFAULT_MAX_UPLOAD_BYTES
    try:
        value = int(raw)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Invalid MAX_UPLOAD_BYTES") from exc
    if value <= 0:
        raise HTTPException(status_code=500, detail="MAX_UPLOAD_BYTES must be > 0")
    return value


def _storage_mode_env() -> str:
    return os.getenv("STORAGE_MODE", "auto").strip().lower()


def is_r2_configured() -> bool:
    required = ("S3_ENDPOINT", "S3_KEY_ID", "S3_KEY_SECRET")
    return all(os.getenv(name) for name in required)


def resolve_storage_mode(requested_mode: str | None = None) -> StorageMode:
    if requested_mode is not None and requested_mode not in {"r2", "local"}:
        raise HTTPException(
            status_code=400, detail="storage_mode must be either 'r2' or 'local'"
        )

    if requested_mode == "r2" and not is_r2_configured():
        raise HTTPException(
            status_code=400,
            detail="R2 storage requested but S3_ENDPOINT/S3_KEY_ID/S3_KEY_SECRET are not configured",
        )
    if requested_mode in {"r2", "local"}:
        return cast(StorageMode, requested_mode)

    mode = _storage_mode_env()
    if mode == "local":
        return "local"
    if mode == "r2":
        if not is_r2_configured():
            raise HTTPException(
                status_code=500,
                detail="STORAGE_MODE is 'r2' but R2 credentials are missing",
            )
        return "r2"
    if mode == "auto":
        return "r2" if is_r2_configured() else "local"

    raise HTTPException(status_code=500, detail="Unsupported STORAGE_MODE value")


def sanitize_filename(filename: str) -> str:
    basename = Path(filename).name
    sanitized = re.sub(r"[^A-Za-z0-9._-]", "_", basename).strip("._")
    return sanitized or "image.bin"


_UUID_PREFIX_LEN = 37  # 36-char UUID + 1 hyphen
_MAX_SAFE_NAME = 200  # keeps full basename well under the 255-byte ext4 limit


def _truncate_filename(name: str, max_len: int) -> str:
    """Truncate *name* to *max_len* chars while preserving its extension."""
    if len(name) <= max_len:
        return name
    dot = name.rfind(".")
    if dot > 0:
        ext = name[dot:]  # e.g. ".png"
        stem = name[:dot][: max_len - len(ext)]
        return stem + ext
    return name[:max_len]


def build_object_key(filename: str) -> str:
    safe_name = _truncate_filename(sanitize_filename(filename), _MAX_SAFE_NAME)
    upload_prefix = os.getenv("STORAGE_UPLOAD_PREFIX", DEFAULT_UPLOAD_PREFIX).strip("/")
    if not upload_prefix:
        upload_prefix = DEFAULT_UPLOAD_PREFIX
    return f"{upload_prefix}/{uuid.uuid4()}-{safe_name}"


def build_content_addressed_key(sha256: str) -> str:
    """Return a deterministic storage key derived from the file's sha256 hash."""
    upload_prefix = os.getenv("STORAGE_UPLOAD_PREFIX", DEFAULT_UPLOAD_PREFIX).strip("/")
    if not upload_prefix:
        upload_prefix = DEFAULT_UPLOAD_PREFIX
    return f"{upload_prefix}/{sha256}"


def check_r2_object_exists(key: str) -> bool:
    client = _r2_client()
    try:
        client.head_object(Bucket=bucket_name(), Key=key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"404", "NoSuchKey"}:
            return False
        raise HTTPException(
            status_code=500, detail="Storage HEAD check failed"
        ) from exc
    except BotoCoreError as exc:
        raise HTTPException(
            status_code=500, detail="Storage HEAD check failed"
        ) from exc


def check_local_object_exists(key: str) -> bool:
    return local_path_for_key(key).exists()


def check_object_exists(key: str, storage_mode: StorageMode) -> bool:
    if storage_mode == "local":
        return check_local_object_exists(key)
    return check_r2_object_exists(key)


@lru_cache(maxsize=1)
def _r2_client():
    endpoint = os.getenv("S3_ENDPOINT")
    key_id = os.getenv("S3_KEY_ID")
    key_secret = os.getenv("S3_KEY_SECRET")
    if not endpoint or not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="R2 credentials are not configured")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=key_id,
        aws_secret_access_key=key_secret,
        region_name=os.getenv("S3_REGION", "auto"),
        config=BotoConfig(signature_version="s3v4"),
    )


def build_r2_public_url(key: str) -> str | None:
    public_base = os.getenv("R2_PUBLIC_BASE_URL")
    if not public_base:
        return None
    return f"{public_base.rstrip('/')}/{key}"


def build_local_object_url(base_url: str, key: str) -> str:
    return f"{base_url.rstrip('/')}/api/v1/storage/local-object/{key}"


# Magic-byte signatures for accepted image formats.
_IMAGE_MAGIC: list[bytes] = [
    b"\xff\xd8\xff",  # JPEG
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"GIF87a",  # GIF87a
    b"GIF89a",  # GIF89a
    b"BM",  # BMP
    b"II*\x00",  # TIFF (little-endian)
    b"MM\x00*",  # TIFF (big-endian)
]
_RIFF_MAGIC = b"RIFF"
_WEBP_MARKER = b"WEBP"


def is_image_bytes(data: bytes) -> bool:
    """Return True if *data* starts with a recognised image magic signature."""
    for sig in _IMAGE_MAGIC:
        if data[: len(sig)] == sig:
            return True
    # WebP: RIFF????WEBP
    if data[:4] == _RIFF_MAGIC and data[8:12] == _WEBP_MARKER:
        return True
    return False


def local_path_for_key(key: str) -> Path:
    root = local_storage_root()
    candidate = (root / key).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid storage key path") from exc
    return candidate


def save_local_object(key: str, body: bytes) -> None:
    path = local_path_for_key(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)


def load_local_object(key: str) -> bytes:
    path = local_path_for_key(key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Object not found")
    return path.read_bytes()


def local_media_type_for_key(key: str) -> str:
    guessed, _ = mimetypes.guess_type(key)
    return guessed or "application/octet-stream"


def create_r2_upload_url(key: str, content_type: str) -> str:
    client = _r2_client()
    try:
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket_name(),
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=presign_expiry_seconds(),
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=500, detail="Failed to generate upload URL"
        ) from exc


def load_r2_object(key: str) -> bytes:
    client = _r2_client()
    try:
        response = client.get_object(Bucket=bucket_name(), Key=key)
        payload = response.get("Body")
        if payload is None:
            raise HTTPException(
                status_code=500, detail="R2 get_object returned no body"
            )
        return payload.read()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in {"NoSuchKey", "404"}:
            raise HTTPException(status_code=404, detail="Object not found") from exc
        raise HTTPException(status_code=500, detail="Failed to fetch object") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch object") from exc


def r2_cache_root() -> Path | None:
    path = os.getenv("R2_CACHE_ROOT")
    return Path(path) if path else None


def _cache_path_for_key(key: str) -> Path | None:
    """Return the local cache file path for a content-addressed R2 key, or None if caching is disabled."""
    root = r2_cache_root()
    if root is None:
        return None
    # Key format is "uploads/<sha256>"; the sha256 segment is always 64 lowercase hex chars.
    sha256 = key.rsplit("/", 1)[-1]
    if not re.fullmatch(r"[0-9a-f]{64}", sha256):
        raise HTTPException(status_code=400, detail="Invalid cache key format")
    candidate = (root / sha256).resolve()
    root_resolved = root.resolve()
    try:
        candidate.relative_to(root_resolved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid cache key path") from exc
    return candidate


def load_r2_object_cached(key: str) -> bytes:
    """Load from local cache when available, otherwise fetch from R2 and cache the result."""
    cache = _cache_path_for_key(key)
    if cache is not None and cache.exists():
        return cache.read_bytes()
    data = load_r2_object(key)
    if cache is not None:
        cache.parent.mkdir(parents=True, exist_ok=True)
        tmp = cache.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.rename(cache)
    return data


def cleanup_stale_cache() -> None:
    """Delete cache files older than R2_CACHE_MAX_AGE_HOURS (default 24)."""
    root = r2_cache_root()
    if root is None or not root.exists():
        return
    try:
        max_age_hours = int(os.getenv("R2_CACHE_MAX_AGE_HOURS", "24"))
    except ValueError:
        max_age_hours = 24
    cutoff = time.time() - max_age_hours * 3600
    for f in root.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            f.unlink(missing_ok=True)


def load_object_bytes(key: str, storage_mode: StorageMode) -> bytes:
    if storage_mode == "local":
        return load_local_object(key)
    return load_r2_object_cached(key)
