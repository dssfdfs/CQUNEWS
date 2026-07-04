from __future__ import annotations

from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from .database import CrawlLog, CrawlSource, News, engine
from .logger import logger
from .scheduler import trigger_crawl_now, _job


router = APIRouter(prefix="/api", tags=["CQUNEWS"])


class NewsItemOut(BaseModel):
    id: int
    title: str
    summary: str | None
    content: str | None
    category: str | None
    source: str | None
    original_url: str
    published_at: str | None
    views: int
    is_trending: bool
    created_at: str | None


class NewsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[NewsItemOut]


class CrawlRunRequest(BaseModel):
    source_ids: list[int] = Field(default_factory=list)
    max_articles_per_source: int = 15


class CrawlRunResponse(BaseModel):
    triggered: bool
    message: str
    started_at: str


class CrawlSourceOut(BaseModel):
    id: int
    name: str
    url: str
    category: str | None
    enabled: int
    last_crawl_at: str | None


class CrawlLogOut(BaseModel):
    id: int
    source_id: int | None
    source_name: str | None
    status: str
    total: int
    success: int
    failed: int
    error_msg: str | None
    duration_ms: int | None
    created_at: str | None


def _to_news_out(n: News) -> NewsItemOut:
    return NewsItemOut(
        id=n.id or 0,
        title=n.title,
        summary=n.summary,
        content=n.content,
        category=n.category,
        source=n.source,
        original_url=n.original_url,
        published_at=n.published_at,
        views=n.views or 0,
        is_trending=bool(n.is_trending),
        created_at=n.created_at,
    )


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "cqunews-backend",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/news", response_model=NewsListResponse)
def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
    trending_only: bool = False,
    ids: List[int] | None = Query(None),
) -> NewsListResponse:
    with Session(engine) as db:
        stmt = select(News)
        if ids:
            stmt = stmt.where(News.id.in_(ids))  # type: ignore[attr-defined]
        if category:
            stmt = stmt.where(News.category == category)
        if source:
            stmt = stmt.where(col(News.source).like(f"%{source}%"))
        if trending_only:
            stmt = stmt.where(News.is_trending == 1)
        if keyword:
            like = f"%{keyword}%"
            stmt = stmt.where(
                (col(News.title).like(like)) | (col(News.summary).like(like))
            )
        total = len(db.exec(stmt).all())
        offset = (page - 1) * page_size
        items = db.exec(
            stmt.order_by(News.id.desc()).offset(offset).limit(page_size)  # type: ignore[attr-defined]
        ).all()
        return NewsListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[_to_news_out(n) for n in items],
        )


@router.get("/news/{news_id}", response_model=NewsItemOut)
def get_news(news_id: int) -> NewsItemOut:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        return _to_news_out(news)


@router.post("/news/{news_id}/view")
def increment_news_views(news_id: int) -> dict[str, Any]:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        news.views = (news.views or 0) + 1
        db.commit()
        return {"success": True, "views": news.views}


@router.post("/news/{news_id}/summary")
async def generate_news_summary(news_id: int) -> dict[str, Any]:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        if not news.content:
            raise HTTPException(status_code=400, detail="新闻内容为空")

        from .ai_proxy import MODEL_CONFIGS
        config = MODEL_CONFIGS.get("DeepSeek")
        if not config:
            raise HTTPException(status_code=400, detail="不支持的模型")

        target_url = config["url"]
        target_api_key = config["default_key"]
        target_model = config["model_name"]

        if not target_api_key:
            raise HTTPException(status_code=400, detail="请在设置中心配置API密钥")

        try:
            import httpx
            async with httpx.AsyncClient(timeout=300.0) as client:
                system_prompt = "你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份中文的标准摘要。"
                user_prompt = f"""请对以下新闻内容进行标准摘要：

{news.content}

要求：
1. 准确概括新闻的核心内容
2. 保持客观中立的立场
3. 语言简洁明了
4. 使用中文"""

                payload = {
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500,
                }

                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {target_api_key}",
                }

                response = await client.post(target_url, json=payload, headers=headers)

                if not response.is_success:
                    logger.warning("AI API request failed: %s %s", response.status_code, response.text)
                    raise HTTPException(status_code=response.status_code, detail=f"API调用失败: {response.text[:200]}")

                result = response.json()
                summary = result["choices"][0]["message"]["content"]

                news.summary = summary
                db.commit()

                return {"success": True, "summary": summary}

        except httpx.RequestError as e:
            logger.error("AI API request error: %s", e)
            raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")
        except Exception as e:
            logger.error("Generate summary error: %s", e)
            raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@router.get("/categories")
def list_categories() -> dict[str, list[str]]:
    with Session(engine) as db:
        rows = db.exec(select(News.category).distinct()).all()
        cats = [r for r in rows if r]
        return {"categories": sorted(cats)}


@router.get("/sources", response_model=list[CrawlSourceOut])
def list_sources() -> list[CrawlSourceOut]:
    with Session(engine) as db:
        rows = db.exec(select(CrawlSource).order_by(CrawlSource.id.asc())).all()  # type: ignore[attr-defined]
        return [CrawlSourceOut(**r.model_dump()) for r in rows]


@router.post("/crawl/run", response_model=CrawlRunResponse)
def run_crawl_now(req: CrawlRunRequest) -> CrawlRunResponse:
    try:
        if req.source_ids:
            from .crawler import run_crawl_by_source_ids

            run_crawl_by_source_ids(req.source_ids)
        else:
            trigger_crawl_now()
        return CrawlRunResponse(
            triggered=True,
            message="Crawl finished (synchronous).",
            started_at=datetime.now().isoformat(),
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Crawl trigger failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crawl/logs", response_model=list[CrawlLogOut])
def list_crawl_logs(limit: int = Query(20, ge=1, le=200)) -> list[CrawlLogOut]:
    with Session(engine) as db:
        rows = db.exec(
            select(CrawlLog).order_by(CrawlLog.id.desc()).limit(limit)  # type: ignore[attr-defined]
        ).all()
        return [CrawlLogOut(**r.model_dump()) for r in rows]




class ParseUrlRequest(BaseModel):
    url: str = Field(..., description="要解析的网页URL")


class ParseUrlResponse(BaseModel):
    success: bool
    title: str = ""
    content: str = ""
    summary: str = ""
    error: str = ""


@router.post("/parse-url", response_model=ParseUrlResponse)
def parse_url(req: ParseUrlRequest) -> ParseUrlResponse:
    try:
        from .crawler import _session, fetch_article
        
        session = _session()
        result = fetch_article(session, req.url, "url_parser", "")
        
        if result:
            return ParseUrlResponse(
                success=True,
                title=result.title,
                content=result.content,
                summary=result.summary,
            )
        else:
            return ParseUrlResponse(
                success=False,
                error="无法解析该网页内容",
            )
    except Exception as e:
        logger.error("URL parse failed: %s", e)
        return ParseUrlResponse(
            success=False,
            error=str(e),
        )

@router.get("/stats")
def stats() -> dict[str, Any]:
    with Session(engine) as db:
        total = len(db.exec(select(News)).all())
        trending = len(db.exec(select(News).where(News.is_trending == 1)).all())
        source_count = len(db.exec(select(CrawlSource)).all())
        log_count = len(db.exec(select(CrawlLog)).all())
        latest = db.exec(
            select(News).order_by(News.id.desc()).limit(1)  # type: ignore[attr-defined]
        ).first()
        return {
            "total_news": total,
            "trending_news": trending,
            "sources": source_count,
            "crawl_runs": log_count,
            "latest_news": _to_news_out(latest) if latest else None,
        }
