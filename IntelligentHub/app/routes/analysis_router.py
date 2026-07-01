from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.crud.news_article_crud import get_all_news_articles
from app.services.analysis_service import cluster_events, analyze_hot_keywords, generate_word_cloud_data, analyze_sentiment_distribution, analyze_word_sentiment
from app.database import get_db

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/events")
def get_events(db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    events = cluster_events(articles)
    return events


@router.get("/hot-keywords")
def get_hot_keywords(days: int = 7, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    keywords = analyze_hot_keywords(articles, days)
    return keywords


@router.get("/word-cloud")
def get_word_cloud(source_id: int = None, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    word_cloud_data = generate_word_cloud_data(articles, source_id)
    return word_cloud_data


@router.get("/sentiment-distribution")
def get_sentiment_distribution(db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    distribution = analyze_sentiment_distribution(articles)
    return distribution


@router.get("/word-sentiment")
def get_word_sentiment(keyword: str = None, db: Session = Depends(get_db)):
    articles = get_all_news_articles(db)
    result = analyze_word_sentiment(articles, keyword)
    return result