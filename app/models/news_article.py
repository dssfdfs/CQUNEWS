from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from datetime import datetime
from app.database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)
    url_hash = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text)
    summary = Column(Text)
    summary_short = Column(Text)
    summary_medium = Column(Text)
    summary_long = Column(Text)
    sentiment_score = Column(Float, default=0.0)
    sentiment_label = Column(String, default="neutral")
    source_id = Column(Integer, ForeignKey("news_sources.id"))
    score = Column(Float, default=0.0)
    kept = Column(Boolean, default=True)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)