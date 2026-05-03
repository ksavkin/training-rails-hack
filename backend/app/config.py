import os
from pathlib import Path

APP_NAME = os.getenv("APP_NAME", "training-rails")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET")

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_DIR = BACKEND_DIR.parent


def get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY")


def get_gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", GEMINI_MODEL)


def get_supabase_url() -> str | None:
    return os.getenv("SUPABASE_URL")


def require_service_role_key() -> str:
    """All backend operations against Supabase need service_role:
    - Storage download bypasses bucket privacy
    - Pin PATCH/GET happens after `REVOKE UPDATE FROM anon` (migration 0002),
      so anon/publishable can't write
    Fail loudly with a clear message instead of returning the publishable key
    and watching writes 401 at runtime.
    """
    from fastapi import HTTPException
    key = os.getenv("SUPABASE_SECRET_KEY")
    if not key:
        raise HTTPException(
            status_code=500,
            detail=(
                "SUPABASE_SECRET_KEY (service_role) is not configured. "
                "The publishable/anon key cannot perform backend mutations after "
                "migration 0002 revokes UPDATE on pins from anon. "
                "Set SUPABASE_SECRET_KEY in backend/.env."
            ),
        )
    return key


def get_supabase_storage_bucket() -> str | None:
    return os.getenv("SUPABASE_STORAGE_BUCKET", SUPABASE_STORAGE_BUCKET or "")
