from sqlalchemy.orm import Session
from app.models.news_source import NewsSource
from app.schemas.news_source import NewsSourceCreate


def create_news_source(db: Session, source: NewsSourceCreate):
    db_source = NewsSource(
        name=source.name,
        url=source.url,
        source_type=source.source_type,
        rss_url=source.rss_url,
        enabled=source.enabled
    )
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


def get_news_source(db: Session, source_id: int):
    return db.query(NewsSource).filter(NewsSource.id == source_id).first()


def get_all_news_sources(db: Session, skip: int = 0, limit: int = 100):
    return db.query(NewsSource).offset(skip).limit(limit).all()


def update_news_source(db: Session, source_id: int, source_update: NewsSourceCreate):
    db_source = get_news_source(db, source_id)
    if db_source:
        db_source.name = source_update.name
        db_source.url = source_update.url
        db_source.source_type = source_update.source_type
        db_source.rss_url = source_update.rss_url
        db_source.enabled = source_update.enabled
        db.commit()
        db.refresh(db_source)
    return db_source


def delete_news_source(db: Session, source_id: int):
    db_source = get_news_source(db, source_id)
    if db_source:
        db.delete(db_source)
        db.commit()
    return db_source