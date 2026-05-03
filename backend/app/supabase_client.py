import mimetypes
from dataclasses import dataclass
from urllib import error, parse, request

from fastapi import HTTPException

from app.config import get_supabase_storage_bucket, get_supabase_url, require_service_role_key


@dataclass
class StorageImage:
    data: bytes
    mime_type: str
    path: str
    bucket: str


def download_storage_image(image_path: str, bucket: str | None = None) -> StorageImage:
    supabase_url = get_supabase_url()
    storage_bucket = bucket or get_supabase_storage_bucket()

    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
    if not storage_bucket:
        raise HTTPException(status_code=500, detail="SUPABASE_STORAGE_BUCKET is not configured")
    supabase_key = require_service_role_key()

    object_url = build_storage_object_url(supabase_url, storage_bucket, image_path)
    storage_request = request.Request(
        object_url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="GET",
    )

    try:
        with request.urlopen(storage_request, timeout=30) as response:
            data = response.read()
            mime_type = response.headers.get_content_type()
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Supabase storage error: {detail}") from exc
    except (error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not download Supabase image: {exc}") from exc

    if not data:
        raise HTTPException(status_code=502, detail=f"Supabase returned an empty image: {image_path}")

    if mime_type == "application/octet-stream":
        mime_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"

    return StorageImage(data=data, mime_type=mime_type, path=image_path, bucket=storage_bucket)


def build_storage_object_url(supabase_url: str, bucket: str, image_path: str) -> str:
    base_url = supabase_url.rstrip("/")
    encoded_bucket = parse.quote(bucket.strip("/"), safe="")
    encoded_path = parse.quote(image_path.strip("/"), safe="/")
    return f"{base_url}/storage/v1/object/{encoded_bucket}/{encoded_path}"
