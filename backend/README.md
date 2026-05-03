# Backend API

Simple FastAPI backend for training-rails.

## Setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

## Run

```powershell
Set-Location backend
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Define API routes in `backend/app/main.py`.

Built-in docs are available at `http://127.0.0.1:8000/docs`.
