from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.news_source_crud import create_news_source, get_news_source, get_all_news_sources, update_news_source, delete_news_source
from app.crud.news_article_crud import create_news_article, get_news_article_by_url_hash, get_news_article_by_url
from app.schemas.news_source import NewsSourceCreate, NewsSourceResponse
from app.schemas.news_article import NewsArticleCreate
from app.services.crawler_service import crawl_source
from app.services.ai_service import generate_summary, calculate_score, check_consistency
from app.database import get_db

router = APIRouter(prefix="/sources", tags=["news_sources"])


@router.post("/", response_model=NewsSourceResponse)
def create_source(source: NewsSourceCreate, db: Session = Depends(get_db)):
    return create_news_source(db, source)


@router.get("/", response_model=list[NewsSourceResponse])
def get_sources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_all_news_sources(db, skip, limit)


@router.get("/{source_id}", response_model=NewsSourceResponse)
def get_source(source_id: int, db: Session = Depends(get_db)):
    source = get_news_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.put("/{source_id}", response_model=NewsSourceResponse)
def update_source(source_id: int, source: NewsSourceCreate, db: Session = Depends(get_db)):
    updated = update_news_source(db, source_id, source)
    if not updated:
        raise HTTPException(status_code=404, detail="Source not found")
    return updated


@router.delete("/{source_id}", response_model=NewsSourceResponse)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    deleted = delete_news_source(db, source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    return deleted


@router.post("/{source_id}/crawl")
async def crawl_source_articles(source_id: int, max_depth: int = 2, max_articles: int = 10, db: Session = Depends(get_db)):
    source = get_news_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    try:
        articles = await crawl_source(source.url, max_depth, max_articles)
        results = []
        
        for article_data in articles:
            existing = get_news_article_by_url_hash(db, article_data["url_hash"])
            if existing:
                results.append({"url": article_data["url"], "status": "skipped", "reason": "Duplicate URL"})
                continue
            
            existing_url = get_news_article_by_url(db, article_data["url"])
            if existing_url:
                results.append({"url": article_data["url"], "status": "skipped", "reason": "Duplicate URL"})
                continue
            
            score = calculate_score(article_data["content"])
            summary = generate_summary(article_data["content"])
            consistent = check_consistency(article_data["title"], article_data["content"])
            
            article = NewsArticleCreate(
                url=article_data["url"],
                url_hash=article_data["url_hash"],
                title=article_data["title"],
                content=article_data["content"],
                summary=summary,
                source_id=source_id,
                score=score,
                kept=consistent and score > 0.3
            )
            
            db_article = create_news_article(db, article)
            results.append({
                "url": article_data["url"],
                "status": "ingested",
                "article_id": db_article.id,
                "score": score
            })
        
        return {
            "source_id": source_id,
            "source_url": source.url,
            "total_found": len(articles),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crawl-url")
async def crawl_url_directly(url: str, max_depth: int = 2, max_articles: int = 10, db: Session = Depends(get_db)):
    try:
        articles = await crawl_source(url, max_depth, max_articles)
        results = []
        
        for article_data in articles:
            existing = get_news_article_by_url_hash(db, article_data["url_hash"])
            if existing:
                results.append({"url": article_data["url"], "status": "skipped", "reason": "Duplicate URL"})
                continue
            
            existing_url = get_news_article_by_url(db, article_data["url"])
            if existing_url:
                results.append({"url": article_data["url"], "status": "skipped", "reason": "Duplicate URL"})
                continue
            
            score = calculate_score(article_data["content"])
            summary = generate_summary(article_data["content"])
            consistent = check_consistency(article_data["title"], article_data["content"])
            
            article = NewsArticleCreate(
                url=article_data["url"],
                url_hash=article_data["url_hash"],
                title=article_data["title"],
                content=article_data["content"],
                summary=summary,
                source_id=None,
                score=score,
                kept=consistent and score > 0.3
            )
            
            db_article = create_news_article(db, article)
            results.append({
                "url": article_data["url"],
                "status": "ingested",
                "article_id": db_article.id,
                "score": score
            })
        
        return {
            "url": url,
            "total_found": len(articles),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))