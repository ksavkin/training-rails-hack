import base64
import json
from urllib import error, request

from fastapi import HTTPException

from app.config import get_gemini_api_key, get_gemini_model

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SEVERITY_PROMPT = (
    "You are inspecting train track defect imagery. "
    "Estimate the severity of the visible rail or track defect on a conservative 1.0 to 10.0 scale. "
    "Use 1.0 to 1.9 for cosmetic marks, small surface scratches, light discoloration, tiny edge nicks, "
    "or normal wear with no visible structural threat. "
    "Use 2.0 to 3.9 for minor defects that should be logged or monitored, such as shallow flaking, "
    "small chips, light spalling, or early squats without clear depth. "
    "Use 4.0 to 5.9 for moderate defects needing maintenance planning, such as visible cracks, repeated "
    "flaking, deeper spalling, or localized material loss. "
    "Use 6.0 to 7.9 for severe defects that need urgent inspection or repair, such as large cracks, "
    "deep squats, significant rail head damage, loose/missing fasteners, or damage affecting support. "
    "Use 8.0 to 8.9 only when the image shows very severe damage with credible near-term operational risk. "
    "Use 9.0 to 10.0 only when derailment or immediate track failure appears possible, such as broken rail, "
    "rail separation, major fracture, severe geometry failure, or missing critical support. "
    "If the defect looks like superficial rail-surface markings or minor wear, choose close to 1.0. "
    "If the image is blurry or uncertain, do not inflate the score; choose the lowest severity consistent "
    "with the visible evidence. "
    "Return only valid JSON with one numeric field named severity."
)


def request_severity(image_data: bytes, mime_type: str) -> str:
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    payload = build_gemini_payload(image_data, mime_type)
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


def build_gemini_payload(image_bytes: bytes, mime_type: str) -> dict:
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")

    return {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": encoded_image,
                        }
                    },
                    {"text": SEVERITY_PROMPT},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "object",
                "properties": {
                    "severity": {
                        "type": "number",
                        "minimum": 1.0,
                        "maximum": 10.0,
                    }
                },
                "required": ["severity"],
            },
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
