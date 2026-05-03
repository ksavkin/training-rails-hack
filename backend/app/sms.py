import os
from dataclasses import dataclass

from fastapi import HTTPException
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client


@dataclass
class SMSResult:
    message_sid: str
    status: str
    to: str


def send_sms(body: str, to: str | None = None) -> SMSResult:
    sender = os.getenv("TWILIO_SANDBOX_FROM")
    recipient = to or os.getenv("PERSONAL_PHONE")

    if not sender:
        raise HTTPException(
            status_code=500,
            detail="Missing TWILIO_SANDBOX_FROM",
        )
    if not recipient:
        raise HTTPException(
            status_code=400,
            detail="Set PERSONAL_PHONE or pass a recipient phone number",
        )

    try:
        message = get_twilio_client().messages.create(
            to=recipient,
            from_=sender,
            body=body,
        )
    except TwilioRestException as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SMSResult(
        message_sid=message.sid,
        status=message.status,
        to=message.to,
    )


def get_twilio_client() -> Client:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")

    if not account_sid or not auth_token:
        raise HTTPException(
            status_code=500,
            detail="Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
        )

    return Client(account_sid, auth_token)
