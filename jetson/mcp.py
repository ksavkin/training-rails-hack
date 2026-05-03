from mcp.server.fastmcp import FastMCP

mcp = FastMCP("training-rails-jetson")

@mcp.tool()
def get_jetson_health() -> dict:
    return {
        "status": "healthy"
    }

if __name__ == "__main__":
    mcp.run()