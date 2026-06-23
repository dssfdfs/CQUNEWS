from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class event_article(Base):
    __tablename__ = "event_article"

    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    article_id = Column(Integer, ForeignKey("news_articles.id"), primary_key=True)