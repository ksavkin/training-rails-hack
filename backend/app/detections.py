from fastapi import HTTPException

from app.gemini_client import request_severity
from app.severity import parse_severity
from app.supabase_client import download_storage_image


def detect_defect(defect: dict) -> dict:
    image_path = defect.get("image_path")
    if not image_path:
        raise HTTPException(status_code=400, detail="Missing required field: image_path")

    image_bucket = defect.get("image_bucket")
    storage_image = download_storage_image(image_path, image_bucket)
    gemini_text = request_severity(storage_image.data, storage_image.mime_type)
    severity = parse_severity(gemini_text)

    return detection_response(severity)


def detection_response(severity: float) -> dict:
    return {"severity": severity}
