import json
from datetime import datetime, timezone
from urllib import error, parse, request

from fastapi import HTTPException

from app.config import get_supabase_url, require_service_role_key


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_pin(pin_id: str) -> dict:
    supabase_url = get_supabase_url()
    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
    supabase_key = require_service_role_key()

    get_url = f"{supabase_url.rstrip('/')}/rest/v1/pins?id=eq.{parse.quote(pin_id, safe='')}&select=*"
    req = request.Request(
        get_url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Supabase read error: {detail}") from exc
    except (error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not read pin: {exc}") from exc

    if not data:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found")
    return data[0]


def _patch(pin_id: str, set_fields: dict, allowed_from: list[str] | None = None) -> dict:
    supabase_url = get_supabase_url()
    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
    supabase_key = require_service_role_key()

    qs = f"id=eq.{parse.quote(pin_id, safe='')}"
    if allowed_from:
        statuses = ",".join(allowed_from)
        qs += f"&status=in.({statuses})"

    patch_url = f"{supabase_url.rstrip('/')}/rest/v1/pins?{qs}"
    body = json.dumps(set_fields).encode("utf-8")

    req = request.Request(
        patch_url,
        data=body,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="PATCH",
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Supabase update error: {detail}") from exc
    except (error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not update pin: {exc}") from exc

    if not data:
        raise HTTPException(
            status_code=409,
            detail=f"Pin {pin_id} not found or status transition not allowed",
        )

    return data[0]


def acknowledge_pin(pin_id: str) -> dict:
    return _patch(
        pin_id,
        {"status": "acknowledged", "acknowledged_at": _now_iso()},
        allowed_from=["new"],
    )


def resolve_pin(pin_id: str) -> dict:
    return _patch(
        pin_id,
        {"status": "resolved", "resolved_at": _now_iso()},
        allowed_from=["new", "acknowledged", "dispatched"],
    )


def reopen_pin(pin_id: str) -> dict:
    """Bring a resolved pin back to its prior active status.

    We don't keep a full transition log, but the *_at timestamp columns
    (`dispatched_at`, `acknowledged_at`) survive the resolve transition,
    so they encode where the pin came from. Priority: dispatched first,
    then acknowledged, else new. Only `resolved_at` is cleared — we keep
    the other timestamps as historical evidence of what happened to the
    pin before it was resolved.

    Refuses if pin is not currently resolved (allowed_from=['resolved'])
    so a double-click returns 409 instead of clobbering an active pin.
    """
    current = get_pin(pin_id)
    if current.get("status") != "resolved":
        raise HTTPException(
            status_code=409,
            detail=f"Pin {pin_id} is not resolved (status='{current.get('status')}')",
        )
    if current.get("dispatched_at"):
        prev = "dispatched"
    elif current.get("acknowledged_at"):
        prev = "acknowledged"
    else:
        prev = "new"
    return _patch(
        pin_id,
        {"status": prev, "resolved_at": None},
        allowed_from=["resolved"],
    )


def mark_dispatched(pin_id: str, sms_sid: str | None = None) -> dict:
    """Atomically claim dispatch slot. Refuses if pin not in {new, acknowledged}."""
    fields: dict = {"status": "dispatched", "dispatched_at": _now_iso()}
    if sms_sid:
        fields["sms_sid"] = sms_sid
    return _patch(pin_id, fields, allowed_from=["new", "acknowledged"])


def set_pin_sms_sid(pin_id: str, sms_sid: str) -> dict:
    """Backfill sms_sid after a successful Twilio send. No status filter."""
    return _patch(pin_id, {"sms_sid": sms_sid})


def rollback_dispatch(pin_id: str) -> dict | None:
    """Revert a claimed-but-unsent dispatch. Only fires if SMS failed after mark_dispatched.

    Determines the rollback target from the LIVE row (acknowledged_at presence),
    not from a stale cached prev_status. This handles the race where the pin was
    transitioned new→acknowledged between get_pin and mark_dispatched: the live
    `acknowledged_at` column is the ground truth for whether the pin was
    acknowledged before our claim.

    Returns the updated pin, or None if the pin is no longer in 'dispatched'
    (someone else moved it after our claim — abandon rollback rather than fight).
    """
    current = get_pin(pin_id)
    if current.get("status") != "dispatched":
        return None
    target = "acknowledged" if current.get("acknowledged_at") else "new"
    return _patch(
        pin_id,
        {"status": target, "dispatched_at": None, "sms_sid": None},
        allowed_from=["dispatched"],
    )
