from sqlalchemy.orm import Session
from app.models.news_article import NewsArticle
from app.schemas.news_article import NewsArticleCreate
from datetime import datetime


def create_news_article(db: Session, article: NewsArticleCreate):
    db_article = NewsArticle(
        url=article.url,
        url_hash=article.url_hash if hasattr(article, 'url_hash') else '',
        title=article.title,
        content=article.content,
        summary=article.summary,
        summary_short=article.summary_short if hasattr(article, 'summary_short') else None,
        summary_medium=article.summary_medium if hasattr(article, 'summary_medium') else None,
        summary_long=article.summary_long if hasattr(article, 'summary_long') else None,
        sentiment_score=article.sentiment_score if hasattr(article, 'sentiment_score') else 0.0,
        sentiment_label=article.sentiment_label if hasattr(article, 'sentiment_label') else "neutral",
        source_id=article.source_id,
        score=article.score,
        kept=article.kept,
        published_at=article.published_at
    )
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article


def update_article_summary(db: Session, article_id: int, summary_short: str = None, summary_medium: str = None, summary_long: str = None):
    db_article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if db_article:
        if summary_short:
            db_article.summary_short = summary_short
        if summary_medium:
            db_article.summary_medium = summary_medium
        if summary_long:
            db_article.summary_long = summary_long
        db.commit()
        db.refresh(db_article)
    return db_article


def update_article_sentiment(db: Session, article_id: int, sentiment_score: float, sentiment_label: str):
    db_article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if db_article:
        db_article.sentiment_score = sentiment_score
        db_article.sentiment_label = sentiment_label
        db.commit()
        db.refresh(db_article)
    return db_article


def get_news_article(db: Session, article_id: int):
    return db.query(NewsArticle).filter(NewsArticle.id == article_id).first()


def get_news_article_by_url_hash(db: Session, url_hash: str):
    return db.query(NewsArticle).filter(NewsArticle.url_hash == url_hash).first()


def get_news_article_by_url(db: Session, url: str):
    return db.query(NewsArticle).filter(NewsArticle.url == url).first()


def get_all_news_articles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(NewsArticle).offset(skip).limit(limit).all()


def search_articles(db: Session, keyword: str = None, start_date: datetime = None, end_date: datetime = None, source_id: int = None):
    query = db.query(NewsArticle)
    if keyword:
        query = query.filter(NewsArticle.title.contains(keyword) | NewsArticle.content.contains(keyword))
    if start_date:
        query = query.filter(NewsArticle.published_at >= start_date)
    if end_date:
        query = query.filter(NewsArticle.published_at <= end_date)
    if source_id:
        query = query.filter(NewsArticle.source_id == source_id)
    return query.all()


def delete_news_article(db: Session, article_id: int):
    db_article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if db_article:
        db.delete(db_article)
        db.commit()
    return db_article


def delete_news_articles_by_ids(db: Session, article_ids: list = None):
    if article_ids:
        deleted_count = db.query(NewsArticle).filter(NewsArticle.id.in_(article_ids)).delete(synchronize_session=False)
    else:
        deleted_count = db.query(NewsArticle).delete(synchronize_session=False)
    db.commit()
    return deleted_count