from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class article_entity(Base):
    __tablename__ = "article_entity"

    article_id = Column(Integer, ForeignKey("news_articles.id"), primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), primary_key=True)