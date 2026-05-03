import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from app.routes import router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

APP_NAME = os.getenv("APP_NAME", "training-rails")

app = FastAPI(title=APP_NAME)
app.include_router(router)
