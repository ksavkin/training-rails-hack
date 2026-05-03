import hmac
import os

from fastapi import Header, HTTPException


def verify_api_token(authorization: str | None = Header(default=None)) -> None:
    """Dependency that gates mutation endpoints behind a static Bearer token.

    Raises 500 if API_TOKEN is not configured on the server (fail-closed:
    refuse to serve mutations rather than silently bypass auth).
    Raises 401 on missing or wrong header.
    Uses constant-time comparison to avoid timing oracles.
    """
    expected = os.getenv("API_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=500,
            detail="API_TOKEN is not configured on the server",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Bearer token",
        )
    presented = authorization[len("Bearer "):]
    if not hmac.compare_digest(presented, expected):
        raise HTTPException(status_code=401, detail="Invalid API token")
