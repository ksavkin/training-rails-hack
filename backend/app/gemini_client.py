import base64
import json
import mimetypes
from pathlib import Path
from urllib import error, request

from fastapi import HTTPException

from app.config import get_gemini_api_key, get_gemini_model

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SEVERITY_PROMPT = (
    "You are inspecting train track defect imagery. "
    "Estimate the severity of the visible rail or track defect on a 1.0 to 10.0 scale, "
    "where 1.0 is cosmetic or minor and 10.0 is critical or needs immediate repair. "
    "Defect examples include squats, transverse cracks, longitudinal cracks, flaking, "
    "spalling, shelling, missing fasteners, and broken rail. "
    "Return only valid JSON in this exact shape: {\"severity\": 7.5}"
)


def request_severity(image_path: Path) -> str:
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    payload = build_gemini_payload(image_path)
    gemini_request = request.Request(
        GEMINI_URL.format(model=get_gemini_model()),
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

    return extract_text(response_body)


def build_gemini_payload(image_path: Path) -> dict:
    mime_type = mimetypes.guess_type(image_path.name)[0] or "image/jpeg"
    image_data = base64.b64encode(image_path.read_bytes()).decode("utf-8")

    return {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_data,
                        }
                    },
                    {"text": SEVERITY_PROMPT},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "response_mime_type": "application/json",
        },
    }


def extract_text(response_body: dict) -> str:
    try:
        parts = response_body["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini returned an unexpected response") from exc

    text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
    text = "".join(text_parts).strip()
    if not text:
        raise HTTPException(status_code=502, detail="Gemini did not return severity text")

    return text
