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


def get_supabase_key() -> str | None:
    return os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")


def get_supabase_storage_bucket() -> str | None:
    return os.getenv("SUPABASE_STORAGE_BUCKET", SUPABASE_STORAGE_BUCKET or "")
