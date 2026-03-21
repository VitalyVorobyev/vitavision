import re
from typing import Literal

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from services import storage_service
from limiter import limiter

# Content-addressed key format: "{prefix}/{sha256}" where sha256 is 64 lowercase hex chars.
_STORAGE_KEY_PATTERN = re.compile(r"^[a-z0-9_-]+/[0-9a-f]{64}$")


def _validate_storage_key(key: str) -> None:
    """Raise 400 if *key* does not match the expected content-addressed format."""
    if not _STORAGE_KEY_PATTERN.match(key):
        raise HTTPException(
            status_code=400,
            detail="Invalid storage key format: expected '{prefix}/{sha256}'",
        )


_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
}

router = APIRouter(tags=["Storage"])


class UploadTicketRequest(BaseModel):
    sha256: str = Field(..., pattern=r"^[0-9a-f]{64}$")
    content_type: str = Field(default="image/jpeg", min_length=1, max_length=128)
    size: int | None = Field(default=None, gt=0)
    storage_mode: Literal["r2", "local"] | None = None

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        if v not in _ALLOWED_CONTENT_TYPES:
            raise ValueError(
                f"content_type must be one of: {', '.join(sorted(_ALLOWED_CONTENT_TYPES))}"
            )
        return v


class UploadDescriptor(BaseModel):
    url: str
    method: Literal["PUT"]
    headers: dict[str, str]


class UploadTicketResponse(BaseModel):
    exists: bool
    storage_mode: Literal["r2", "local"]
    bucket: str
    key: str
    upload: UploadDescriptor | None = None
    preview_url: str | None = None
    expires_in_seconds: int


class LocalUploadResponse(BaseModel):
    status: Literal["ok"]
    key: str
    bytes_written: int
    preview_url: str


@router.post("/upload-ticket", response_model=UploadTicketResponse)
@limiter.limit("20/minute")
async def create_upload_ticket(request: Request, payload: UploadTicketRequest):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    key = storage_service.build_content_addressed_key(payload.sha256)

    # Short-circuit: if the object is already in storage, skip the upload entirely.
    if storage_service.check_object_exists(key, storage_mode):
        if storage_mode == "r2":
            preview_url = storage_service.build_r2_public_url(key)
        else:
            preview_url = storage_service.build_local_object_url(
                str(request.base_url), key
            )
        return UploadTicketResponse(
            exists=True,
            storage_mode=storage_mode,
            bucket=storage_service.bucket_name(),
            key=key,
            upload=None,
            preview_url=preview_url,
            expires_in_seconds=0,
        )

    upload_headers = {"Content-Type": payload.content_type}

    if storage_mode == "r2":
        expires = storage_service.presign_expiry_seconds()
        upload_url = storage_service.create_r2_upload_url(key, payload.content_type)
        preview_url = storage_service.build_r2_public_url(key)
    else:
        expires = 0
        upload_url = (
            f"{str(request.base_url).rstrip('/')}/api/v1/storage/local-upload/{key}"
        )
        preview_url = storage_service.build_local_object_url(str(request.base_url), key)
        api_key_header = request.headers.get("x-api-key")
        if api_key_header:
            upload_headers["X-API-Key"] = api_key_header

    return UploadTicketResponse(
        exists=False,
        storage_mode=storage_mode,
        bucket=storage_service.bucket_name(),
        key=key,
        upload=UploadDescriptor(
            url=upload_url,
            method="PUT",
            headers=upload_headers,
        ),
        preview_url=preview_url,
        expires_in_seconds=expires,
    )


@router.put("/local-upload/{key:path}", response_model=LocalUploadResponse)
@limiter.limit("20/minute")
async def local_upload(
    request: Request,
    key: str,
    body: bytes = Body(...),
):
    _validate_storage_key(key)
    if not body:
        raise HTTPException(status_code=400, detail="Upload body is empty")
    if len(body) > storage_service.max_upload_bytes():
        raise HTTPException(status_code=413, detail="Request body too large")
    if not storage_service.is_image_bytes(body):
        raise HTTPException(
            status_code=415,
            detail="Unsupported media type: not a recognised image format",
        )

    storage_service.save_local_object(key, body)
    preview_url = storage_service.build_local_object_url(str(request.base_url), key)
    return LocalUploadResponse(
        status="ok", key=key, bytes_written=len(body), preview_url=preview_url
    )


@router.get("/local-object/{key:path}")
@limiter.limit("60/minute")
async def local_object(request: Request, key: str):
    _validate_storage_key(key)
    path = storage_service.local_path_for_key(key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Object not found")

    return FileResponse(
        path=path,
        media_type=storage_service.local_media_type_for_key(key),
        filename=path.name,
        content_disposition_type="attachment",
    )
