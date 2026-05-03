from fastapi import APIRouter, Depends, HTTPException

from app.auth import verify_api_token
from app.config import APP_NAME
from app.detections import detect_defect
from app.dispatch import dispatch_operator
from app.pins import acknowledge_pin, resolve_pin

router = APIRouter()


@router.get("/")
async def root():
    return {"message": f"{APP_NAME} API is running"}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/detect", dependencies=[Depends(verify_api_token)])
async def detect(defect: dict | None = None):
    if defect is None:
        raise HTTPException(status_code=400, detail="Missing JSON request body")

    return detect_defect(defect)


@router.post("/dispatch", dependencies=[Depends(verify_api_token)])
async def dispatch(payload: dict | None = None):
    if payload is None:
        raise HTTPException(status_code=400, detail="Missing JSON request body")

    return dispatch_operator(payload)


@router.post("/pins/{pin_id}/acknowledge", dependencies=[Depends(verify_api_token)])
async def acknowledge(pin_id: str):
    return acknowledge_pin(pin_id)


@router.post("/pins/{pin_id}/resolve", dependencies=[Depends(verify_api_token)])
async def resolve(pin_id: str):
    return resolve_pin(pin_id)
