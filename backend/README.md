# Backend

FastAPI backend for training-rails.

## Setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

## Run

```powershell
Set-Location backend
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Useful endpoints:

- `GET /`
- `GET /health`
- `GET /docs`
