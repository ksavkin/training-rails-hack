"""Field-worker endpoints — public, no API_TOKEN.

Auth model: open URL keyed by `pin_id`. The link arrives via SMS that the
operator sent to a specific phone; we trust possession of the (UUID-like)
pin_id as the demo-grade credential. Hardening (signed token + TTL) is a
documented follow-up in docs/roadmap.md.

Status semantics:
  - accepted, en_route   — log row only; pins.status untouched.
  - completed            — log row + pins.status -> resolved.
  - cannot_complete      — log row + pins.status -> acknowledged
                            (so the dispatcher can re-route to another crew).
"""

import json
from urllib import error, parse, request

from fastapi import HTTPException

from app.config import get_supabase_url, require_service_role_key
from app.pins import _patch, get_pin

ALLOWED_ACTIONS = {"accepted", "en_route", "completed", "cannot_complete"}

# Worker action state machine. Key = last logged action (None for fresh pin),
# value = set of actions allowed next. Enforced server-side so a stale frontend
# or a curl call can't double-press Accept or jump back from a terminal state.
_NEXT_ACTIONS: dict[str | None, set[str]] = {
    None: {"accepted", "cannot_complete"},
    "accepted": {"en_route", "completed", "cannot_complete"},
    "en_route": {"completed", "cannot_complete"},
    "completed": set(),
    "cannot_complete": set(),
}


def _public_pin_view(pin: dict, last_action: str | None = None) -> dict:
    """Strip operator-only fields. The worker doesn't need full audit columns
    and we don't want to leak sms_sid / acknowledged_at / etc. via the open URL.

    `last_action` is the most recent `dispatch_log.action` for this pin (or
    None if the worker hasn't logged anything yet). Drives which buttons the
    UI renders so e.g. Accept disappears after the first press.
    """
    return {
        "id": pin.get("id"),
        "status": pin.get("status"),
        "defect_type": pin.get("defect_type"),
        "severity": pin.get("severity"),
        "confidence": pin.get("confidence"),
        "milepost": pin.get("milepost"),
        "lat": pin.get("lat"),
        "lon": pin.get("lon"),
        "image_path": pin.get("image_path"),
        "captured_at": pin.get("captured_at"),
        "dispatched_at": pin.get("dispatched_at"),
        "work_order_text": pin.get("work_order_text"),
        "last_action": last_action,
    }


def get_pin_for_worker(pin_id: str) -> dict:
    pin = get_pin(pin_id)
    return _public_pin_view(pin, last_action=_latest_action(pin_id))


def _latest_action(pin_id: str) -> str | None:
    """Fetch the most recent dispatch_log.action for this pin via PostgREST."""
    supabase_url = get_supabase_url()
    if not supabase_url:
        return None
    try:
        supabase_key = require_service_role_key()
    except HTTPException:
        return None

    qs = (
        f"pin_id=eq.{parse.quote(pin_id, safe='')}"
        f"&select=action&order=created_at.desc&limit=1"
    )
    url = f"{supabase_url.rstrip('/')}/rest/v1/dispatch_log?{qs}"
    req = request.Request(
        url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError):
        return None
    return data[0]["action"] if data else None


def append_dispatch_log(pin_id: str, payload: dict) -> dict:
    action = payload.get("action")
    if action not in ALLOWED_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"action must be one of {sorted(ALLOWED_ACTIONS)}",
        )

    # Verify the pin exists. Avoids inserting orphan log rows pointing at
    # a deleted pin (FK ON DELETE CASCADE would clean up later, but a 404
    # here is a clearer signal to the worker that the link is dead).
    pin = get_pin(pin_id)

    # State-machine guard: don't allow Accept twice, can't go en_route before
    # accepting, terminal states are terminal. Enforced here (not just in UI)
    # so a stale frontend or curl can't bypass it.
    last = _latest_action(pin_id)
    allowed_next = _NEXT_ACTIONS.get(last, set())
    if action not in allowed_next:
        if not allowed_next:
            raise HTTPException(
                status_code=409,
                detail=f"Pin {pin_id} is in terminal worker state '{last}'; no further actions allowed",
            )
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot {action!r} after {last!r}. "
                f"Allowed next: {sorted(allowed_next)}"
            ),
        )

    comment = payload.get("comment")
    worker_lat = payload.get("worker_lat")
    worker_lon = payload.get("worker_lon")

    log_row = _insert_log(
        pin_id=pin_id,
        action=action,
        comment=comment,
        worker_lat=worker_lat,
        worker_lon=worker_lon,
    )

    updated_pin = pin
    if action == "completed":
        # allowed_from covers any active state; if someone already resolved
        # the pin from the operator dashboard, we don't fight them — just
        # return the log row.
        if pin.get("status") != "resolved":
            updated_pin = _patch(
                pin_id,
                {"status": "resolved", "resolved_at": _now_iso_via_pins()},
                allowed_from=["new", "edited", "acknowledged", "dispatched"],
            )
    elif action == "cannot_complete":
        # Send back to acknowledged so the operator sees an open ticket
        # and can dispatch another crew. Only meaningful from `dispatched`.
        if pin.get("status") == "dispatched":
            updated_pin = _patch(
                pin_id,
                {"status": "acknowledged"},
                allowed_from=["dispatched"],
            )

    return {
        "log": log_row,
        "pin": _public_pin_view(updated_pin, last_action=action),
    }


def _now_iso_via_pins() -> str:
    # Re-export from app.pins so we don't drift on timestamp format.
    from app.pins import _now_iso
    return _now_iso()


def _insert_log(*, pin_id: str, action: str, comment: str | None,
                worker_lat: float | None, worker_lon: float | None) -> dict:
    supabase_url = get_supabase_url()
    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
    supabase_key = require_service_role_key()

    body_obj: dict = {"pin_id": pin_id, "action": action}
    if comment:
        body_obj["comment"] = comment
    if isinstance(worker_lat, (int, float)):
        body_obj["worker_lat"] = float(worker_lat)
    if isinstance(worker_lon, (int, float)):
        body_obj["worker_lon"] = float(worker_lon)

    insert_url = f"{supabase_url.rstrip('/')}/rest/v1/dispatch_log"
    body = json.dumps(body_obj).encode("utf-8")
    req = request.Request(
        insert_url,
        data=body,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Supabase log insert error: {detail}") from exc
    except (error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not insert log: {exc}") from exc

    return data[0] if data else body_obj
