import subprocess

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("training-rails-jetson")


def run_tegrastats() -> dict:
    try:
        result = subprocess.run(
            ["tegrastats", "--interval", "1000", "--count", "1"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except FileNotFoundError:
        return {
            "ok": False,
            "error": "tegrastats command not found. Run this on a Jetson device.",
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "error": "tegrastats timed out.",
        }

    if result.returncode != 0:
        return {
            "ok": False,
            "error": result.stderr.strip() or f"tegrastats exited with code {result.returncode}",
        }

    return {
        "ok": True,
        "raw": result.stdout.strip(),
    }


@mcp.tool()
def get_jetson_health() -> dict:
    return {
        "status": "healthy"
    }


@mcp.tool()
def get_tegrastats() -> dict:
    return run_tegrastats()


if __name__ == "__main__":
    mcp.run()
