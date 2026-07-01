import asyncio
import os
from app.init_db import init_db

os.environ["API_KEY"] = "1234"

if __name__ == "__main__":
    init_db()
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)