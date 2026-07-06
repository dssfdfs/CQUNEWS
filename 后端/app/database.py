from sqlmodel import SQLModel, Session, create_engine

from .config import settings
from .logger import logger

sqlite_url = f"sqlite:///{settings.DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(
    sqlite_url,
    connect_args=connect_args,
    echo=False,
    pool_size=20,
    max_overflow=50,
    pool_timeout=60,
    pool_recycle=300
)


def get_session():
    with Session(engine) as session:
        yield session


def init_db() -> None:
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _ensure_defaults()
    logger.info("Database initialized: %s", settings.DB_PATH)


def _ensure_defaults() -> None:
    from .admin import ensure_default_admin
    from .models import CrawlSource, News
    from sqlmodel import select

    with Session(engine) as session:
        existing = session.exec(select(CrawlSource)).first()
        if existing is None:
            defaults = [
                CrawlSource(name="新华网-时政", url="http://www.news.cn/politics/", category="时政"),
                CrawlSource(name="新华网-科技", url="http://www.news.cn/tech/", category="科技"),
                CrawlSource(name="新华网-国际", url="http://www.news.cn/world/", category="国际"),
                CrawlSource(name="新华网-财经", url="http://www.news.cn/finance/", category="财经"),
                CrawlSource(name="新华网-体育", url="http://www.news.cn/sports/", category="体育"),
                CrawlSource(name="新华网-健康", url="http://www.news.cn/health/", category="健康"),
                CrawlSource(name="新浪新闻", url="https://news.sina.com.cn/", category="综合"),
                CrawlSource(name="新浪科技", url="https://tech.sina.com.cn/", category="科技"),
                CrawlSource(name="新浪财经", url="https://finance.sina.com.cn/", category="财经"),
                CrawlSource(name="澎湃新闻", url="https://www.thepaper.cn/", category="综合"),
                CrawlSource(name="澎湃科技", url="https://www.thepaper.cn/tech_list.jsp", category="科技"),
                CrawlSource(name="中国新闻网-滚动", url="https://www.chinanews.com.cn/scroll-news/news1.html", category="综合"),
                CrawlSource(name="中国新闻网-科技", url="https://www.chinanews.com.cn/tech/", category="科技"),
                CrawlSource(name="中国新闻网-财经", url="https://www.chinanews.com.cn/finance/", category="财经"),
                CrawlSource(name="网易新闻", url="https://news.163.com/", category="综合"),
                CrawlSource(name="网易科技", url="https://tech.163.com/", category="科技"),
                CrawlSource(name="网易财经", url="https://finance.163.com/", category="财经"),
                CrawlSource(name="腾讯新闻", url="https://news.qq.com/", category="综合"),
                CrawlSource(name="腾讯科技", url="https://tech.qq.com/", category="科技"),
                CrawlSource(name="腾讯财经", url="https://finance.qq.com/", category="财经"),
                CrawlSource(name="凤凰网", url="https://www.ifeng.com/", category="综合"),
                CrawlSource(name="凤凰科技", url="https://tech.ifeng.com/", category="科技"),
                CrawlSource(name="凤凰财经", url="https://finance.ifeng.com/", category="财经"),
                CrawlSource(name="央视新闻", url="https://news.cctv.com/", category="时政"),
                CrawlSource(name="环球网", url="https://www.huanqiu.com/", category="国际"),
                CrawlSource(name="界面新闻", url="https://www.jiemian.com/", category="财经"),
                CrawlSource(name="36氪", url="https://36kr.com/", category="科技"),
                CrawlSource(name="钛媒体", url="https://www.tmtpost.com/", category="科技"),
                CrawlSource(name="第一财经", url="https://www.yicai.com/", category="财经"),
                CrawlSource(name="每日经济新闻", url="https://www.nbd.com.cn/", category="财经"),
            ]
            for s in defaults:
                session.add(s)
            session.commit()

    with Session(engine) as session:
        ensure_default_admin(session)


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
    AdminUser,
    UserBehavior,
    SystemConfig,
    Feedback,
)
