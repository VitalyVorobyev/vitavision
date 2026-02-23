import mimetypes
import os
import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Literal

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

StorageMode = Literal["r2", "local"]

DEFAULT_BUCKET = "vitavision"
DEFAULT_UPLOAD_PREFIX = "uploads"
DEFAULT_PRESIGN_EXPIRY = 900


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
        raise HTTPException(status_code=500, detail="Invalid R2_PRESIGN_EXPIRES_SECONDS") from exc
    if value <= 0:
        raise HTTPException(status_code=500, detail="R2_PRESIGN_EXPIRES_SECONDS must be > 0")
    return value


def _storage_mode_env() -> str:
    return os.getenv("STORAGE_MODE", "auto").strip().lower()


def is_r2_configured() -> bool:
    required = ("S3_ENDPOINT", "S3_KEY_ID", "S3_KEY_SECRET")
    return all(os.getenv(name) for name in required)


def resolve_storage_mode(requested_mode: str | None = None) -> StorageMode:
    if requested_mode is not None and requested_mode not in {"r2", "local"}:
        raise HTTPException(status_code=400, detail="storage_mode must be either 'r2' or 'local'")

    if requested_mode == "r2" and not is_r2_configured():
        raise HTTPException(
            status_code=400,
            detail="R2 storage requested but S3_ENDPOINT/S3_KEY_ID/S3_KEY_SECRET are not configured",
        )
    if requested_mode in {"r2", "local"}:
        return requested_mode

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
        ext = name[dot:]          # e.g. ".png"
        stem = name[:dot][:max_len - len(ext)]
        return stem + ext
    return name[:max_len]


def build_object_key(filename: str) -> str:
    safe_name = _truncate_filename(sanitize_filename(filename), _MAX_SAFE_NAME)
    upload_prefix = os.getenv("STORAGE_UPLOAD_PREFIX", DEFAULT_UPLOAD_PREFIX).strip("/")
    if not upload_prefix:
        upload_prefix = DEFAULT_UPLOAD_PREFIX
    return f"{upload_prefix}/{uuid.uuid4()}-{safe_name}"


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
    b"\xff\xd8\xff",           # JPEG
    b"\x89PNG\r\n\x1a\n",     # PNG
    b"GIF87a",                 # GIF87a
    b"GIF89a",                 # GIF89a
    b"BM",                     # BMP
    b"II*\x00",                # TIFF (little-endian)
    b"MM\x00*",                # TIFF (big-endian)
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
        raise HTTPException(status_code=500, detail="Failed to generate upload URL") from exc


def load_r2_object(key: str) -> bytes:
    client = _r2_client()
    try:
        response = client.get_object(Bucket=bucket_name(), Key=key)
        payload = response.get("Body")
        if payload is None:
            raise HTTPException(status_code=500, detail="R2 get_object returned no body")
        return payload.read()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in {"NoSuchKey", "404"}:
            raise HTTPException(status_code=404, detail="Object not found") from exc
        raise HTTPException(status_code=500, detail="Failed to fetch object") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch object") from exc


def load_object_bytes(key: str, storage_mode: StorageMode) -> bytes:
    if storage_mode == "local":
        return load_local_object(key)
    return load_r2_object(key)
