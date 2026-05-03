import json

from fastapi import HTTPException


def parse_severity(text: str) -> float:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()

    try:
        payload = json.loads(cleaned)
        severity = float(payload["severity"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not parse Gemini severity: {text}") from exc

    return clamp_severity(severity)


def clamp_severity(severity: float) -> float:
    return max(1.0, min(10.0, round(severity, 1)))
