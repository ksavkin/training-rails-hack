# Backend API

Simple FastAPI backend for training-rails.

## Setup

From the repository root:

```bash
python -m venv .venv
source .venv/Scripts/activate

cd backend
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Define API routes in `backend/app/routes.py`.

## PowerShell

If you are using PowerShell instead of bash:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
uvicorn app.main:app --reload
```
