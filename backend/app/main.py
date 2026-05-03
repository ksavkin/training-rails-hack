import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.routes import router

APP_NAME = os.getenv("APP_NAME", "training-rails")

app = FastAPI(title=APP_NAME)
# Demo deployment: open CORS. Auth is enforced server-side via API_TOKEN
# Bearer header on mutation endpoints, so opening up cross-origin reads
# and the worker's public endpoints is fine for the hackathon. Lock down
# post-demo if needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
