from __future__ import annotations

from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from .ai_summary import generate_summary_for_news_item
from .database import CrawlLog, CrawlSource, News, Session, engine
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


class GenerateSummaryResponse(BaseModel):
    success: bool
    news_id: int
    summary: str | None
    message: str


@router.post("/news/{news_id}/summary", response_model=GenerateSummaryResponse)
def generate_summary_for_news(news_id: int) -> GenerateSummaryResponse:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")

        if not news.content:
            return GenerateSummaryResponse(
                success=False,
                news_id=news_id,
                summary=None,
                message="No content available for summarization",
            )

        try:
            summary = generate_summary_for_news_item(news.content, news.title)
            if summary:
                news.summary = summary
                news.updated_at = datetime.now().isoformat()
                db.commit()
                return GenerateSummaryResponse(
                    success=True,
                    news_id=news_id,
                    summary=summary,
                    message="Summary generated successfully",
                )
            else:
                return GenerateSummaryResponse(
                    success=False,
                    news_id=news_id,
                    summary=None,
                    message="Failed to generate summary",
                )
        except Exception as e:
            logger.error("Failed to generate summary for news %d: %s", news_id, e)
            return GenerateSummaryResponse(
                success=False,
                news_id=news_id,
                summary=None,
                message=f"Error generating summary: {str(e)}",
            )


class BatchSummaryResponse(BaseModel):
    total_processed: int
    success_count: int
    failed_count: int
    messages: list[str]


@router.post("/news/summary/batch", response_model=BatchSummaryResponse)
def generate_batch_summary(
    limit: int = Query(10, ge=1, le=50),
) -> BatchSummaryResponse:
    with Session(engine) as db:
        news_items = db.exec(
            select(News)
            .where(
                ((News.summary.is_(None)) | (News.summary == ""))
                & (News.content.is_not(None))
                & (col(News.content).length() > 100)
            )
            .limit(limit)
        ).all()

        if not news_items:
            return BatchSummaryResponse(
                total_processed=0,
                success_count=0,
                failed_count=0,
                messages=["No news items need summarization"],
            )

        success_count = 0
        failed_count = 0
        messages: list[str] = []

        for news in news_items:
            try:
                summary = generate_summary_for_news_item(news.content or "", news.title)
                if summary:
                    news.summary = summary
                    news.updated_at = datetime.now().isoformat()
                    success_count += 1
                    messages.append(f"Successfully generated summary for news {news.id}")
                else:
                    failed_count += 1
                    messages.append(f"Failed to generate summary for news {news.id}")
            except Exception as e:
                failed_count += 1
                messages.append(f"Error processing news {news.id}: {str(e)}")

        db.commit()

        return BatchSummaryResponse(
            total_processed=len(news_items),
            success_count=success_count,
            failed_count=failed_count,
            messages=messages,
        )
