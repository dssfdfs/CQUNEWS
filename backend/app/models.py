from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class News(SQLModel, table=True):
    __tabname__ = "news"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=500)
    summary: Optional[str] = Field(default=None)
    content: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None, max_length=100, index=True)
    source: Optional[str] = Field(default=None, max_length=100, index=True)
    original_url: str = Field(max_length=1000, unique=True, index=True)
    published_at: Optional[str] = Field(default=None)
    views: int = Field(default=0)
    is_trending: int = Field(default=0)
    crawl_status: int = Field(default=0)
    created_at: Optional[str] = Field(default=None)
    updated_at: Optional[str] = Field(default=None)


class CrawlSource(SQLModel, table=True):
    __tabname__ = "crawlsource"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    url: str = Field(max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    enabled: int = Field(default=1)
    last_crawl_at: Optional[str] = Field(default=None)
    created_at: Optional[str] = Field(default=None)


class CrawlLog(SQLModel, table=True):
    __tabname__ = "crawllog"

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: Optional[int] = Field(default=None, index=True)
    source_name: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(max_length=32)
    total: int = Field(default=0)
    success: int = Field(default=0)
    failed: int = Field(default=0)
    error_msg: Optional[str] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)
    created_at: Optional[str] = Field(default=None)


class User(SQLModel, table=True):
    __tabname__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=64, unique=True, index=True)
    email: str = Field(max_length=128, unique=True, index=True)
    phone: Optional[str] = Field(default=None, max_length=32, index=True)
    password_hash: str = Field(max_length=255)
    status: str = Field(default="active", max_length=16)
    last_login_at: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserProfile(SQLModel, table=True):
    __tabname__ = "user_profile"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    nickname: Optional[str] = Field(default=None, max_length=64)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    bio: Optional[str] = Field(default=None, max_length=500)
    gender: Optional[str] = Field(default=None, max_length=8)
    birthday: Optional[str] = Field(default=None, max_length=16)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserProfileHistory(SQLModel, table=True):
    __tabname__ = "user_profile_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    nickname: Optional[str] = Field(default=None, max_length=64)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    bio: Optional[str] = Field(default=None, max_length=500)
    changed_field: str = Field(max_length=32)
    old_value: Optional[str] = Field(default=None)
    new_value: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserSettings(SQLModel, table=True):
    __tabname__ = "user_settings"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)

    theme_mode: str = Field(default="light", max_length=16)
    theme_color: str = Field(default="#1677ff", max_length=16)
    font_size: str = Field(default="medium", max_length=16)

    language: str = Field(default="zh-CN", max_length=16)
    timezone: str = Field(default="Asia/Shanghai", max_length=64)
    date_format: str = Field(default="YYYY-MM-DD", max_length=16)
    time_format: str = Field(default="24h", max_length=8)
    number_format: str = Field(default="zh-CN", max_length=16)

    two_factor_enabled: int = Field(default=0)
    two_factor_secret: Optional[str] = Field(default=None, max_length=128)
    two_factor_backup_codes: Optional[str] = Field(default=None, max_length=500)

    notify_system: int = Field(default=1)
    notify_message: int = Field(default=1)
    notify_marketing: int = Field(default=0)
    notify_email: int = Field(default=1)
    notify_sms: int = Field(default=0)
    notify_in_app: int = Field(default=1)
    notify_frequency: str = Field(default="realtime", max_length=16)

    storage_used_bytes: int = Field(default=0)

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class LoginHistory(SQLModel, table=True):
    __tabname__ = "login_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    ip_address: Optional[str] = Field(default=None, max_length=64)
    device: Optional[str] = Field(default=None, max_length=128)
    location: Optional[str] = Field(default=None, max_length=128)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="success", max_length=16)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Notification(SQLModel, table=True):
    __tabname__ = "notification"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    category: str = Field(max_length=32, index=True)
    channel: str = Field(max_length=32)
    title: str = Field(max_length=255)
    content: Optional[str] = Field(default=None)
    is_read: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AuditLog(SQLModel, table=True):
    __tabname__ = "audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)
    action: str = Field(max_length=64, index=True)
    target: Optional[str] = Field(default=None, max_length=128)
    detail: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None, max_length=64)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ExportJob(SQLModel, table=True):
    __tabname__ = "export_job"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    format: str = Field(max_length=16)
    status: str = Field(default="pending", max_length=16)
    file_path: Optional[str] = Field(default=None, max_length=500)
    file_size: int = Field(default=0)
    expires_at: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = Field(default=None)
