from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .collectors import fetch_article_text
from .processors import score_and_filter
from .storage import init_db, save_article, get_articles, database
from .config import settings
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("intelligenthub")

app = FastAPI(title="intelligenthub")

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

class IngestReq(BaseModel):
    url: str

async def require_apikey(x_api_key: str = Header(None)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")

@app.on_event("startup")
async def startup():
    await init_db()
    await database.connect()
    logger.info("Database connected")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
    logger.info("Database disconnected")

@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/")
async def index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/articles")
async def list_articles(_=Depends(require_apikey)):
    rows = await get_articles()
    return [dict(row) for row in rows]

@app.post("/ingest")
async def ingest(payload: IngestReq, _=Depends(require_apikey)):
    logger.info(f"Ingest URL: {payload.url}")
    text = await fetch_article_text(payload.url)
    if not text:
        raise HTTPException(status_code=400, detail="Failed to fetch article text")
    article = {"title": payload.url.split("/")[-1], "text": text, "url": payload.url}
    res = await score_and_filter(article)
    article.update({"summary": res.get("summary"), "score": res.get("score"), "kept": res.get("keep")})
    if res.get("keep"):
        await save_article(article)
        logger.info(f"Article saved: {payload.url}")
    return {
        "kept": res.get("keep"),
        "score": res.get("score"),
        "summary": res.get("summary"),
        "debug_article": {
            "title": article.get("title"),
            "text_length": len(text),
            "meta": res.get("meta"),
            "text": res.get("text")

        }
    }
