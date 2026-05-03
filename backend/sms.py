import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

app = FastAPI()

# Same credentials as: curl ... -u ACCOUNT_SID:[AuthToken]
account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
auth_token = os.environ.get("TWILIO_AUTH_TOKEN")

# Your personal cell (E.164), verified with Twilio Messaging Sandbox — default SMS recipient.
personal_phone = os.environ.get("PERSONAL_PHONE")

# Twilio sandbox / trial “From” number from Console (Messaging → Sandbox). Not your personal phone.
twilio_sandbox_from = os.environ.get("TWILIO_SANDBOX_FROM")


def get_client() -> Client:
    if not account_sid or not auth_token:
        raise HTTPException(
            status_code=500,
            detail="Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
        )
    return Client(account_sid, auth_token)


class SMSRequest(BaseModel):
    body: str = Field(..., description="Message text")
    to: Optional[str] = Field(
        None,
        description="Recipient E.164; defaults to PERSONAL_PHONE when omitted",
    )


class SMSResponse(BaseModel):
    message_sid: str
    status: str
    to: str


@app.post("/send-sms", response_model=SMSResponse)
def send_sms(sms: SMSRequest):
    """
    Send SMS via Twilio (trial / Messaging Sandbox).

    Set PERSONAL_PHONE to your phone and join the sandbox from that device.
    TWILIO_SANDBOX_FROM is the Twilio-owned sender shown in the Twilio Console.
    """
    if not twilio_sandbox_from:
        raise HTTPException(
            status_code=500,
            detail="Missing TWILIO_SANDBOX_FROM (Twilio sandbox sender from Console)",
        )
    to = sms.to or personal_phone
    if not to:
        raise HTTPException(
            status_code=400,
            detail="Set PERSONAL_PHONE or pass `to` in the request body",
        )

    try:
        message = get_client().messages.create(
            to=to,
            from_=twilio_sandbox_from,
            body=sms.body,
        )
        return SMSResponse(
            message_sid=message.sid,
            status=message.status,
            to=message.to,
        )
    except TwilioRestException as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
