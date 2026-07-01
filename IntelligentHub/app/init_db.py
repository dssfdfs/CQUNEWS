from app.database import engine, Base
from app.models.user import User
from app.models.news_source import NewsSource
from app.models.news_article import NewsArticle
from app.models.keyword import Keyword
from app.models.entity import Entity
from app.models.event import Event
from app.models.article_keyword import article_keyword
from app.models.article_entity import article_entity
from app.models.event_article import event_article


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")


if __name__ == "__main__":
    init_db()