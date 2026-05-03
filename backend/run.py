import os
import socket
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

host = os.getenv("HOST", "0.0.0.0")
port = int(os.getenv("PORT", "8000"))
reload = os.getenv("RELOAD", "false").lower() in {"1", "true", "yes", "on"}


def get_lan_ip() -> str:
    """Return the best LAN-facing IP address for this machine."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return socket.gethostbyname(socket.gethostname())


if __name__ == "__main__":
    if host in {"0.0.0.0", "::"}:
        print(f"LAN URL: http://{get_lan_ip()}:{port}")
    else:
        print(f"Server URL: http://{host}:{port}")

    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
