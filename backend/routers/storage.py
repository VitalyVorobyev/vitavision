from typing import Literal

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from services import storage_service
from limiter import limiter

router = APIRouter(tags=["Storage"])


class UploadTicketRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", min_length=1, max_length=128)
    storage_mode: Literal["r2", "local"] | None = None


class UploadDescriptor(BaseModel):
    url: str
    method: Literal["PUT"]
    headers: dict[str, str]


class UploadTicketResponse(BaseModel):
    storage_mode: Literal["r2", "local"]
    bucket: str
    key: str
    upload: UploadDescriptor
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
    key = storage_service.build_object_key(payload.filename)

    if storage_mode == "r2":
        expires = storage_service.presign_expiry_seconds()
        upload_url = storage_service.create_r2_upload_url(key, payload.content_type)
        preview_url = storage_service.build_r2_public_url(key)
    else:
        expires = 0
        upload_url = f"{str(request.base_url).rstrip('/')}/api/v1/storage/local-upload/{key}"
        preview_url = storage_service.build_local_object_url(str(request.base_url), key)

    return UploadTicketResponse(
        storage_mode=storage_mode,
        bucket=storage_service.bucket_name(),
        key=key,
        upload=UploadDescriptor(
            url=upload_url,
            method="PUT",
            headers={"Content-Type": payload.content_type},
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
    if not body:
        raise HTTPException(status_code=400, detail="Upload body is empty")

    storage_service.save_local_object(key, body)
    preview_url = storage_service.build_local_object_url(str(request.base_url), key)
    return LocalUploadResponse(status="ok", key=key, bytes_written=len(body), preview_url=preview_url)


@router.get("/local-object/{key:path}")
@limiter.limit("60/minute")
async def local_object(request: Request, key: str):
    path = storage_service.local_path_for_key(key)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Local object not found for key: {key}")

    return FileResponse(
        path=path,
        media_type=storage_service.local_media_type_for_key(key),
        filename=path.name,
    )
