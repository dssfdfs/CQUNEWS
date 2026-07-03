from sqlmodel import SQLModel, Session, create_engine, text

from .config import settings
from .logger import logger

sqlite_url = f"sqlite:///{settings.DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args, echo=False)


def get_session() -> Session:
    return Session(engine)


def init_db() -> None:
    from . import models  # noqa: F401
    
    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys = OFF"))
        
        news_create = """
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            summary TEXT,
            content TEXT,
            category VARCHAR(100),
            source VARCHAR(100),
            original_url VARCHAR(1000) UNIQUE,
            published_at TEXT,
            views INTEGER DEFAULT 0,
            is_trending INTEGER DEFAULT 0,
            crawl_status INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(news_create))
        
        crawlsource_create = """
        CREATE TABLE IF NOT EXISTS crawlsource (
            id INTEGER PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            url VARCHAR(500) NOT NULL,
            category VARCHAR(100),
            enabled INTEGER DEFAULT 1,
            last_crawl_at TEXT,
            created_at TEXT
        )
        """
        conn.execute(text(crawlsource_create))
        
        crawllog_create = """
        CREATE TABLE IF NOT EXISTS crawllog (
            id INTEGER PRIMARY KEY,
            source_id INTEGER,
            source_name VARCHAR(100),
            status VARCHAR(32) NOT NULL,
            total INTEGER DEFAULT 0,
            success INTEGER DEFAULT 0,
            failed INTEGER DEFAULT 0,
            error_msg TEXT,
            duration_ms INTEGER,
            created_at TEXT
        )
        """
        conn.execute(text(crawllog_create))
        
        user_create = """
        CREATE TABLE IF NOT EXISTS "user" (
            id INTEGER PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            email VARCHAR(128) UNIQUE NOT NULL,
            password_hash VARCHAR(256) NOT NULL,
            phone VARCHAR(20),
            status VARCHAR(32) DEFAULT 'active',
            created_at TEXT,
            updated_at TEXT,
            last_login_at TEXT
        )
        """
        conn.execute(text(user_create))
        
        userprofile_create = """
        CREATE TABLE IF NOT EXISTS userprofile (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            nickname VARCHAR(128),
            avatar_url VARCHAR(500),
            preferred_categories TEXT,
            reading_habits TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(userprofile_create))
        
        userprofilehistory_create = """
        CREATE TABLE IF NOT EXISTS userprofilehistory (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            change_type VARCHAR(64),
            old_value TEXT,
            new_value TEXT,
            created_at TEXT
        )
        """
        conn.execute(text(userprofilehistory_create))
        
        usersettings_create = """
        CREATE TABLE IF NOT EXISTS usersettings (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            theme VARCHAR(32) DEFAULT 'light',
            font_size VARCHAR(16) DEFAULT 'medium',
            notifications_enabled INTEGER DEFAULT 1,
            summary_length VARCHAR(16) DEFAULT 'medium',
            language VARCHAR(16) DEFAULT 'zh',
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(usersettings_create))
        
        loginhistory_create = """
        CREATE TABLE IF NOT EXISTS loginhistory (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            ip_address VARCHAR(64),
            user_agent VARCHAR(500),
            success INTEGER DEFAULT 1,
            created_at TEXT
        )
        """
        conn.execute(text(loginhistory_create))
        
        notification_create = """
        CREATE TABLE IF NOT EXISTS notification (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            title VARCHAR(256) NOT NULL,
            content TEXT,
            type VARCHAR(32),
            read INTEGER DEFAULT 0,
            created_at TEXT
        )
        """
        conn.execute(text(notification_create))
        
        auditlog_create = """
        CREATE TABLE IF NOT EXISTS auditlog (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            username VARCHAR(64),
            action VARCHAR(64) NOT NULL,
            target VARCHAR(256),
            detail TEXT,
            ip_address VARCHAR(64),
            created_at TEXT
        )
        """
        conn.execute(text(auditlog_create))
        
        exportjob_create = """
        CREATE TABLE IF NOT EXISTS exportjob (
            id INTEGER PRIMARY KEY,
            status VARCHAR(32) DEFAULT 'pending',
            file_path VARCHAR(500),
            created_at TEXT,
            completed_at TEXT
        )
        """
        conn.execute(text(exportjob_create))
        
        admin_create = """
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            password_hash VARCHAR(256) NOT NULL,
            email VARCHAR(128),
            created_at TEXT,
            last_login_at TEXT
        )
        """
        conn.execute(text(admin_create))
        
        systemconfig_create = """
        CREATE TABLE IF NOT EXISTS systemconfig (
            id INTEGER PRIMARY KEY,
            key VARCHAR(128) UNIQUE NOT NULL,
            value TEXT DEFAULT '',
            description VARCHAR(500),
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(systemconfig_create))
        
        useractionlog_create = """
        CREATE TABLE IF NOT EXISTS user_action_log (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            action_type VARCHAR(64),
            action_label VARCHAR(128),
            target_id INTEGER,
            action_metadata TEXT,
            ip_address VARCHAR(64),
            user_agent VARCHAR(500),
            created_at TEXT
        )
        """
        conn.execute(text(useractionlog_create))
        
        aiservice_create = """
        CREATE TABLE IF NOT EXISTS aiservice (
            id INTEGER PRIMARY KEY,
            name VARCHAR(64) UNIQUE NOT NULL,
            display_name VARCHAR(128) NOT NULL,
            api_url VARCHAR(500) NOT NULL,
            default_model VARCHAR(128) NOT NULL,
            description VARCHAR(500),
            enabled INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(aiservice_create))
        
        userapiconfig_create = """
        CREATE TABLE IF NOT EXISTS userapiconfig (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            service_id INTEGER,
            api_key VARCHAR(500) NOT NULL,
            api_url VARCHAR(500),
            model_name VARCHAR(128),
            enabled INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )
        """
        conn.execute(text(userapiconfig_create))
        
        conn.execute(text("PRAGMA foreign_keys = ON"))
    
    _ensure_defaults()
    logger.info("Database initialized: %s", settings.DB_PATH)


def _ensure_defaults() -> None:
    from .models import CrawlSource, News, AIService
    from sqlmodel import select

    with Session(engine) as session:
        existing_source = session.exec(select(CrawlSource)).first()
        if existing_source is None:
            sources = [
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
            for s in sources:
                session.add(s)
        
        existing_service = session.exec(select(AIService)).first()
        if existing_service is None:
            services = [
                AIService(
                    name="deepseek",
                    display_name="DeepSeek",
                    api_url="https://api.deepseek.com/chat/completions",
                    default_model="deepseek-v4-flash",
                    description="DeepSeek大模型API服务",
                ),
                AIService(
                    name="doubao",
                    display_name="豆包",
                    api_url="https://ark.cn-beijing.volces.com/api/v3/chat/completions",
                    default_model="ep-20260702173631-5c5qs",
                    description="火山方舟豆包大模型API服务",
                ),
                AIService(
                    name="wenxin",
                    display_name="文心一言",
                    api_url="https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions",
                    default_model="ernie-4.0",
                    description="百度文心一言大模型API服务",
                ),
                AIService(
                    name="kimi",
                    display_name="Kimi",
                    api_url="https://api.moonshot.cn/v1/chat/completions",
                    default_model="moonshot-v1-8k",
                    description="Moonshot Kimi大模型API服务",
                ),
                AIService(
                    name="qwen",
                    display_name="千问",
                    api_url="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    default_model="qwen-turbo",
                    description="阿里云通义千问大模型API服务",
                ),
            ]
            for s in services:
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
    Admin,
    SystemConfig,
    UserActionLog,
    AIService,
    UserApiConfig,
)
