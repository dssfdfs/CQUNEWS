from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from app.crud.news_article_crud import create_news_article, get_news_article, get_all_news_articles, search_articles, get_news_article_by_url_hash, get_news_article_by_url, update_article_summary, update_article_sentiment
from app.crud.keyword_crud import get_or_create_keyword
from app.crud.entity_crud import get_or_create_entity
from app.schemas.news_article import NewsArticleCreate, NewsArticleResponse, ArticleIngestRequest, SummaryGenerateRequest, SummaryGenerateResponse, SentimentAnalysisResponse
from app.services.crawler_service import crawl_article
from app.services.ai_service import generate_summary, extract_keywords, extract_entities, calculate_score, check_consistency, generate_summary_with_style, analyze_sentiment
from app.database import get_db

router = APIRouter(prefix="/articles", tags=["articles"])


@router.post("/ingest")
async def ingest_article(request: ArticleIngestRequest, db: Session = Depends(get_db)):
    try:
        crawled_data = await crawl_article(request.url)
        
        existing = get_news_article_by_url_hash(db, crawled_data["url_hash"])
        if existing:
            return {"url": request.url, "kept": False, "reason": "Duplicate URL"}
        
        existing_url = get_news_article_by_url(db, crawled_data["url"])
        if existing_url:
            return {"url": request.url, "kept": False, "reason": "Duplicate URL"}
        
        score = calculate_score(crawled_data["content"])
        summary = generate_summary(crawled_data["content"])
        keywords = extract_keywords(crawled_data["content"])
        entities = extract_entities(crawled_data["content"])
        consistent = check_consistency(crawled_data["title"], crawled_data["content"])
        
        article = NewsArticleCreate(
            url=crawled_data["url"],
            url_hash=crawled_data["url_hash"],
            title=crawled_data["title"],
            content=crawled_data["content"],
            summary=summary,
            source_id=1,
            score=score,
            kept=consistent and score > 0.3
        )
        
        db_article = create_news_article(db, article)
        
        for keyword in keywords:
            get_or_create_keyword(db, keyword)
        
        for entity in entities:
            get_or_create_entity(db, entity["name"], entity["type"])
        
        return {
            "url": request.url,
            "kept": db_article.kept,
            "score": score,
            "summary": summary,
            "debug_article": {
                "text_length": crawled_data["text_length"],
                "meta": {"consistent": consistent}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[NewsArticleResponse])
def get_articles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_all_news_articles(db, skip, limit)


@router.get("/{article_id}", response_model=NewsArticleResponse)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = get_news_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/search/")
def search_article(keyword: str = None, start_date: datetime = None, end_date: datetime = None, source_id: int = None, db: Session = Depends(get_db)):
    results = search_articles(db, keyword, start_date, end_date, source_id)
    return results


@router.post("/summary", response_model=SummaryGenerateResponse)
def generate_article_summary(request: SummaryGenerateRequest):
    try:
        summaries = generate_summary_with_style(request.content, request.title, request.length, request.style)
        selected_summary = summaries.get(request.length, summaries["medium"])
        
        return SummaryGenerateResponse(
            summary_short=summaries["short"],
            summary_medium=summaries["medium"],
            summary_long=summaries["long"],
            selected_summary=selected_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{article_id}/summary")
def generate_summary_for_article(article_id: int, length: str = "medium", style: str = "neutral", db: Session = Depends(get_db)):
    article = get_news_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    try:
        summaries = generate_summary_with_style(article.content, article.title, length, style)
        
        update_article_summary(db, article_id, summaries["short"], summaries["medium"], summaries["long"])
        
        return {
            "article_id": article_id,
            "summary_short": summaries["short"],
            "summary_medium": summaries["medium"],
            "summary_long": summaries["long"],
            "selected_summary": summaries.get(length, summaries["medium"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SentimentRequest(BaseModel):
    content: str


@router.post("/sentiment", response_model=SentimentAnalysisResponse)
def analyze_article_sentiment(request: SentimentRequest):
    try:
        result = analyze_sentiment(request.content)
        return SentimentAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{article_id}/sentiment")
def analyze_sentiment_for_article(article_id: int, db: Session = Depends(get_db)):
    article = get_news_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    try:
        result = analyze_sentiment(article.content)
        
        update_article_sentiment(db, article_id, result["sentiment_score"], result["sentiment_label"])
        
        return {
            "article_id": article_id,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))