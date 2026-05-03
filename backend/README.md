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
python run.py
```

If the server is already running, press `CTRL+C` in that terminal before starting it again.

The server binds to `0.0.0.0` by default, so devices on the same LAN can access it. When it starts, it prints the LAN URL to use, for example:

```text
LAN URL: http://192.168.1.25:8000
```

Open that printed URL from another device on the same Wi-Fi or wired network. If Windows asks, allow Python through Windows Firewall for private networks.

The server runs without auto-reload by default so it stays stable for LAN access. To enable reload during local-only development, set `RELOAD=true` in `backend/.env`.

Define API routes in `backend/app/routes.py`.

## PowerShell

If you are using PowerShell instead of bash:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
python run.py
```
