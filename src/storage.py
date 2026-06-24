from databases import Database
from sqlalchemy import MetaData, Table, Column, String, Float, Text, Boolean
from .config import settings

database = Database(settings.DATABASE_URL)
metadata = MetaData()

articles = Table(
    "articles",
    metadata,
    Column("url", String, primary_key=True),
    Column("title", String),
    Column("text", Text),
    Column("summary", Text),
    Column("score", Float),
    Column("kept", Boolean),
)

async def init_db():
    await database.connect()
    query = "CREATE TABLE IF NOT EXISTS articles (url TEXT PRIMARY KEY, title TEXT, text TEXT, summary TEXT, score FLOAT, kept BOOLEAN)"
    await database.execute(query)

async def save_article(article: dict):
    try:
        query = articles.insert().values(
            url=article.get("url"),
            title=article.get("title"),
            text=article.get("text"),
            summary=article.get("summary"),
            score=article.get("score"),
            kept=article.get("score") > 0.5
        )
        await database.execute(query)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            query = articles.update().where(articles.c.url == article.get("url")).values(
                title=article.get("title"),
                text=article.get("text"),
                summary=article.get("summary"),
                score=article.get("score"),
                kept=article.get("score") > 0.5
            )
            await database.execute(query)
        else:
            raise

async def get_articles():
    query = articles.select().order_by(articles.c.score.desc())
    return await database.fetch_all(query)
