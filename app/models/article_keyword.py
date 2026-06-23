from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class article_keyword(Base):
    __tablename__ = "article_keyword"

    article_id = Column(Integer, ForeignKey("news_articles.id"), primary_key=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id"), primary_key=True)