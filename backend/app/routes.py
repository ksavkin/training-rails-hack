import base64
import json
import mimetypes
import os
from pathlib import Path
from urllib import error, request
from uuid import uuid4

from fastapi import APIRouter, HTTPException

APP_NAME = os.getenv("APP_NAME", "training-rails")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent

router = APIRouter()


@router.get("/")
async def root():
    return {"message": f"{APP_NAME} API is running"}


@router.get("/health")
async def health():
    return {"status": "ok"}


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


def extract_gemini_text(response_body: dict) -> str:
    try:
        parts = response_body["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini returned an unexpected response") from exc

    text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
    text = "".join(text_parts).strip()
    if not text:
        raise HTTPException(status_code=502, detail="Gemini did not return severity text")

    return text


def parse_severity(text: str) -> float:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()

    try:
        payload = json.loads(cleaned)
        severity = float(payload["severity"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not parse Gemini severity: {text}") from exc

    return max(1.0, min(10.0, round(severity, 1)))


def get_defect_severity(defect: dict) -> float:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    image_path = defect.get("image_path")
    if not image_path:
        raise HTTPException(status_code=400, detail="Missing required field: image_path")

    resolved_path = resolve_image_path(image_path)
    mime_type = mimetypes.guess_type(resolved_path.name)[0] or "image/jpeg"
    image_data = base64.b64encode(resolved_path.read_bytes()).decode("utf-8")

    prompt = (
        "You are inspecting train track defect imagery. "
        "Estimate the severity of the visible rail or track defect on a 1.0 to 10.0 scale, "
        "where 1.0 is cosmetic or minor and 10.0 is critical or needs immediate repair. "
        "Defect examples include squats, transverse cracks, longitudinal cracks, flaking, "
        "spalling, shelling, missing fasteners, and broken rail. "
        "Return only valid JSON in this exact shape: {\"severity\": 7.5}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_data,
                        }
                    },
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "response_mime_type": "application/json",
        },
    }

    gemini_request = request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(gemini_request, timeout=30) as response:
            response_body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {detail}") from exc
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not call Gemini API: {exc}") from exc

    return parse_severity(extract_gemini_text(response_body))


def detection_response(severity: float):
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


@router.get("/detect")
async def get_detect():
    return detection_response(9.0)


@router.post("/detect")
async def detect(defect: dict | None = None):
    if defect is None:
        raise HTTPException(status_code=400, detail="Missing JSON request body")

    severity = get_defect_severity(defect)
    return detection_response(severity)


# Add more routes below.
# Example:
#
# @router.post("/clients")
# async def create_client(client: dict):
#     return client
