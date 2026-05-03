from fastapi import APIRouter, HTTPException

from app.config import APP_NAME
from app.detections import detect_defect
from app.dispatch import dispatch_operator

router = APIRouter()


@router.get("/")
async def root():
    return {"message": f"{APP_NAME} API is running"}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/detect")
async def detect(defect: dict | None = None):
    if defect is None:
        raise HTTPException(status_code=400, detail="Missing JSON request body")

    return detect_defect(defect)


@router.post("/dispatch")
async def dispatch(payload: dict | None = None):
    if payload is None:
        raise HTTPException(status_code=400, detail="Missing JSON request body")

    return dispatch_operator(payload)
