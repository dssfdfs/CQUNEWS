import os
from dotenv import load_dotenv
from app.init_db import init_db

load_dotenv()

if __name__ == "__main__":
    init_db()
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)