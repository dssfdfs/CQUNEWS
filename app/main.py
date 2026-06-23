from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routes.auth_router import router as auth_router
from app.routes.news_source_router import router as source_router
from app.routes.article_router import router as article_router
from app.routes.analysis_router import router as analysis_router

app = FastAPI(title="CQUNEWS News Aggregation System", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(auth_router)
app.include_router(source_router)
app.include_router(article_router)
app.include_router(analysis_router)


@app.get("/")
def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})