import logging

from fastapi import HTTPException

from app.pins import get_pin, mark_dispatched, rollback_dispatch, set_pin_sms_sid
from app.sms import send_sms

REQUIRED_DISPATCH_FIELDS = ("pin_id", "lat", "lon", "severity", "timestamp")
ALLOWED_PREV_STATUSES = ("new", "acknowledged")

log = logging.getLogger(__name__)


def dispatch_operator(payload: dict) -> dict:
    validate_dispatch_payload(payload)
    pin_id = payload["pin_id"]

    # 1. Pre-check: friendly 409 with the offending status name. mark_dispatched
    #    would 409 anyway via allowed_from, but this lets us return a clearer
    #    error message naming the current state.
    prev = get_pin(pin_id)
    prev_status = prev.get("status")
    if prev_status not in ALLOWED_PREV_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Pin {pin_id} is in status '{prev_status}'; dispatch only allowed from {ALLOWED_PREV_STATUSES}",
        )

    # 2. Atomically claim the dispatch slot. 409 here is benign: someone else
    #    raced us between get_pin and mark_dispatched — no SMS sent.
    mark_dispatched(pin_id)

    # 3. Try SMS. On failure, roll back the claim. rollback_dispatch reads the
    #    live row to determine the correct target (new vs acknowledged), so a
    #    race between our get_pin and mark_dispatched (e.g. someone acked in
    #    that window) doesn't cause us to revert past their change.
    try:
        sms = send_sms(build_dispatch_message(payload))
    except Exception as sms_err:
        try:
            rollback_dispatch(pin_id)
        except Exception as rollback_err:
            log.error(
                "Dispatch rollback failed for %s after SMS error. Pin left in inconsistent state. "
                "sms_error=%s rollback_error=%s",
                pin_id, sms_err, rollback_err,
            )
        raise

    # 4. Backfill sms_sid on the already-dispatched pin.
    pin = set_pin_sms_sid(pin_id, sms.message_sid)

    return {
        "status": "sent",
        "message_sid": sms.message_sid,
        "sms_status": sms.status,
        "to": sms.to,
        "pin": pin,
    }


def validate_dispatch_payload(payload: dict) -> None:
    missing_fields = [
        field for field in REQUIRED_DISPATCH_FIELDS
        if payload.get(field) is None
    ]
    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing_fields)}",
        )


def build_dispatch_message(payload: dict) -> str:
    pin_id = payload["pin_id"]
    lat = payload["lat"]
    lon = payload["lon"]
    severity = payload["severity"]
    timestamp = payload["timestamp"]
    map_url = f"https://maps.google.com/?q={lat},{lon}"

    return (
        "URGENT: Severe track defect detected. Dispatch maintenance immediately.\n"
        f"Pin: {pin_id}\n"
        f"Severity: {severity}\n"
        f"Location: {lat}, {lon}\n"
        f"Time: {timestamp}\n"
        f"Map: {map_url}"
    )
