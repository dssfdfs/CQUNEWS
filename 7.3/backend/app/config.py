import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    APP_NAME: str = "CQUNEWS Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DB_PATH: str = str(PROJECT_ROOT / "cqunews.db")
    LOG_DIR: str = str(PROJECT_ROOT / "logs")
    UPLOAD_DIR: str = str(PROJECT_ROOT / "uploads")
    EXPORT_DIR: str = str(PROJECT_ROOT / "exports")

    JWT_SECRET: str = "change-me-in-production-please-use-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60 * 24
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    CRAWL_INTERVAL_MINUTES: int = 60
    CRAWL_TIMEOUT: int = 20
    CRAWL_DELAY_MIN: float = 0.8
    CRAWL_DELAY_MAX: float = 2.0

    AVATAR_MAX_SIZE_BYTES: int = 2 * 1024 * 1024
    AVATAR_ALLOWED_FORMATS: list[str] = ["png", "jpg", "jpeg", "webp", "gif"]
    AVATAR_DEFAULT_SIZE: int = 256

    USER_AGENTS: list[str] = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

os.makedirs(settings.LOG_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
