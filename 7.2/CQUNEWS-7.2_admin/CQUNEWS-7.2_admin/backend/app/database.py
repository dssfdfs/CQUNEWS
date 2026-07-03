from sqlmodel import SQLModel, Session, create_engine

from .config import settings
from .logger import logger

sqlite_url = f"sqlite:///{settings.DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args, echo=False)


def get_session() -> Session:
    return Session(engine)


def init_db() -> None:
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _ensure_defaults()
    logger.info("Database initialized: %s", settings.DB_PATH)


def _ensure_defaults() -> None:
    from .models import CrawlSource, News
    from sqlmodel import select

    with Session(engine) as session:
        existing = session.exec(select(CrawlSource)).first()
        if existing is not None:
            return
        defaults = [
            CrawlSource(name="新华网-时政", url="http://www.news.cn/politics/", category="时政"),
            CrawlSource(name="新华网-科技", url="http://www.news.cn/tech/", category="科技"),
            CrawlSource(name="新华网-国际", url="http://www.news.cn/world/", category="国际"),
            CrawlSource(name="新浪新闻", url="https://news.sina.com.cn/", category="综合"),
            CrawlSource(name="澎湃新闻", url="https://www.thepaper.cn/", category="综合"),
            CrawlSource(
                name="中国新闻网-滚动",
                url="https://www.chinanews.com.cn/scroll-news/news1.html",
                category="综合",
            ),
        ]
        for s in defaults:
            session.add(s)
        session.commit()


# Re-export ORM models and SQLAlchemy helpers for backward-compatible imports
from sqlmodel import select  # noqa: E402,F401

from .models import (  # noqa: E402,F401
    News,
    CrawlSource,
    CrawlLog,
    User,
    UserProfile,
    UserProfileHistory,
    UserSettings,
    LoginHistory,
    Notification,
    AuditLog,
    ExportJob,
)
