from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# Add more routes below.
# Example:
#
# @app.post("/clients")
# async def create_client(client: dict):
#     return client
