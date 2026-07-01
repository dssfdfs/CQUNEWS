from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .ai_proxy import router as ai_proxy_router
from .config import settings
from .database import init_db
from .logger import logger
from .routers import router as news_router
from .scheduler import shutdown_scheduler, start_scheduler
from .settings_router import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    logger.info("Starting APScheduler...")
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()
        logger.info("Shutdown complete.")


class UTF8JSONResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="CQUNEWS 今日新闻速览后端：新闻爬虫 + 用户设置中心 REST API",
    lifespan=lifespan,
    default_response_class=UTF8JSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    import time

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "|G3| %s %s -> %s (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return UTF8JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "参数校验失败", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return UTF8JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "服务器内部错误", "message": str(exc)},
    )


@app.get("/", tags=["root"])
def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


app.include_router(news_router)
app.include_router(settings_router)
app.include_router(ai_proxy_router)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
