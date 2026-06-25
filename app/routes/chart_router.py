from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.crud.news_article_crud import get_all_news_articles
from app.services.chart_service import get_daily_article_count, get_source_distribution, get_sentiment_trend, get_keyword_trend, get_top_keywords
from app.database import get_db

router = APIRouter(prefix="/charts", tags=["charts"])


@router.get("/daily-articles")
def get_daily_articles(db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    return get_daily_article_count(articles)


@router.get("/source-distribution")
def get_sources(db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    return get_source_distribution(articles)


@router.get("/sentiment-trend")
def get_sentiment(days: int = 7, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    return get_sentiment_trend(articles, days)


@router.get("/keyword-trend")
def get_keyword(keyword: str, days: int = 7, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    return get_keyword_trend(articles, keyword, days)


@router.get("/top-keywords")
def get_top(limit: int = 10, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    return get_top_keywords(articles, limit)
