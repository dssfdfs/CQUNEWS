from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

import httpx

from .config import settings
from .database import CrawlLog, CrawlSource, News, engine
from .logger import logger
from .scheduler import trigger_crawl_now, _job


MODEL_CONFIGS = {
    "DeepSeek": {
        "url": settings.DEEPSEEK_API_URL,
        "default_key": settings.DEEPSEEK_API_KEY,
        "model_name": settings.DEEPSEEK_MODEL_NAME,
    },
    "豆包": {
        "url": f"{settings.DOUBAO_API_URL}/chat/completions",
        "default_key": settings.DOUBAO_API_KEY,
        "model_name": settings.DOUBAO_MODEL_NAME,
    },
}


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
            stmt = stmt.where(News.source == source)
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


class GenerateSummaryResponse(BaseModel):
    success: bool
    summary: str = ""
    error: str = ""


@router.post("/news/{news_id}/summary", response_model=GenerateSummaryResponse)
async def generate_news_summary(news_id: int) -> GenerateSummaryResponse:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            return GenerateSummaryResponse(success=False, error="新闻不存在")
        
        if not news.content:
            return GenerateSummaryResponse(success=False, error="新闻没有内容，无法生成摘要")
    
    model_name = "豆包"
    config = MODEL_CONFIGS.get(model_name)
    if not config:
        return GenerateSummaryResponse(success=False, error=f"不支持的模型: {model_name}")
    
    target_api_key = config["default_key"]
    if not target_api_key:
        return GenerateSummaryResponse(success=False, error="请在设置中心配置API密钥")
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            content_text = news.content or news.title or ""
            if len(content_text) > 5000:
                content_text = content_text[:5000] + "..."
            
            messages = [
                {
                    "role": "system",
                    "content": "你是一个专业的新闻摘要生成助手。请根据提供的新闻内容，生成一个简洁、准确的中文摘要。摘要应包含新闻的核心信息，包括时间、地点、人物、事件、原因和结果。"
                },
                {
                    "role": "user",
                    "content": f"请为以下新闻内容生成摘要：\n\n标题：{news.title}\n\n内容：{content_text}"
                }
            ]
            
            payload = {
                "model": config["model_name"],
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {target_api_key}",
            }
            
            response = await client.post(config["url"], json=payload, headers=headers)
            
            if not response.is_success:
                logger.warning("AI API request failed: %s %s", response.status_code, response.text)
                return GenerateSummaryResponse(success=False, error=f"API调用失败: {response.text[:200]}")
            
            result = response.json()
            
            summary_text = ""
            choices = result.get("choices")
            if choices and isinstance(choices, list) and len(choices) > 0:
                message = choices[0].get("message")
                if message:
                    content = message.get("content")
                    if isinstance(content, str):
                        summary_text = content
                    elif isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict):
                                if item.get("type") == "text":
                                    summary_text = item.get("text", "")
                                    break
                                elif item.get("type") == "output_text":
                                    summary_text = item.get("text", "")
                                    break
            
            if not summary_text:
                output = result.get("output", [])
                if isinstance(output, list) and len(output) > 0:
                    for item in output:
                        if item.get("type") == "message" and item.get("role") == "assistant":
                            content = item.get("content", [])
                            if isinstance(content, str):
                                summary_text = content
                            elif isinstance(content, list):
                                for content_item in content:
                                    if isinstance(content_item, dict):
                                        if content_item.get("type") == "output_text":
                                            summary_text = content_item.get("text", "")
                                            break
                                        elif content_item.get("type") == "text":
                                            summary_text = content_item.get("text", "")
                                            break
                    if not summary_text:
                        for item in output:
                            summary = item.get("summary", [])
                            if isinstance(summary, list):
                                for summary_item in summary:
                                    if isinstance(summary_item, dict) and summary_item.get("type") == "summary_text":
                                        summary_text = summary_item.get("text", "")
                                        break
            
            if not summary_text:
                summary_text = result.get("output_text", "")
            
            if summary_text:
                with Session(engine) as db:
                    news = db.get(News, news_id)
                    if news:
                        news.summary = summary_text
                        db.add(news)
                        db.commit()
                        db.refresh(news)
            
            return GenerateSummaryResponse(success=True, summary=summary_text)
    
    except httpx.RequestError as e:
        logger.error("AI API request error: %s", e)
        return GenerateSummaryResponse(success=False, error=f"网络连接失败: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error("AI API response parse error: %s", e)
        return GenerateSummaryResponse(success=False, error="API响应解析失败")


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
