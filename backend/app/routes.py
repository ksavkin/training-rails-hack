import os

from fastapi import APIRouter

APP_NAME = os.getenv("APP_NAME", "training-rails")

router = APIRouter()


@router.get("/")
async def root():
    return {"message": f"{APP_NAME} API is running"}


@router.get("/health")
async def health():
    return {"status": "ok"}


# Add more routes below.
# Example:
#
# @router.post("/clients")
# async def create_client(client: dict):
#     return client
