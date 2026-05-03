from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.config import BACKEND_DIR, REPO_DIR
from app.gemini_client import request_severity
from app.severity import parse_severity


def detect_defect(defect: dict) -> dict:
    image_path = defect.get("image_path")
    if not image_path:
        raise HTTPException(status_code=400, detail="Missing required field: image_path")

    resolved_path = resolve_image_path(image_path)
    severity = parse_severity(request_severity(resolved_path))

    return detection_response(severity)


def resolve_image_path(image_path: str) -> Path:
    path = Path(image_path)
    candidates = [
        path,
        BACKEND_DIR / path,
        REPO_DIR / path,
    ]

    for candidate in candidates:
        if candidate.is_file():
            return candidate

    raise HTTPException(status_code=400, detail=f"Image not found: {image_path}")


def detection_response(severity: float) -> dict:
    return {
        "pin_id": str(uuid4()),
        "severity": severity,
        "severity_breakdown": {
            "base": severity,
            "size_factor": 0,
            "position_factor": 0,
        },
        "is_critical": severity >= 8.0,
        "sms_queued": True,
        "status": "new",
    }
