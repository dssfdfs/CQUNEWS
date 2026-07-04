from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from passlib.context import CryptContext
from sqlmodel import Session, select

from .config import settings
from .database import get_session
from .logger import logger
from .models import AuditLog, LoginHistory, User, UserProfile, UserSettings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def check_password_strength(password: str) -> tuple[int, list[str]]:
    """Return a score from 0-4 and a list of suggestions."""
    suggestions: list[str] = []
    score = 0
    if len(password) >= 8:
        score += 1
    else:
        suggestions.append("密码长度至少为 8 位")
    if any(ch.islower() for ch in password) and any(ch.isupper() for ch in password):
        score += 1
    else:
        suggestions.append("请包含大小写字母")
    if any(ch.isdigit() for ch in password):
        score += 1
    else:
        suggestions.append("请包含至少一个数字")
    if any(not ch.isalnum() for ch in password):
        score += 1
    else:
        suggestions.append("请包含至少一个特殊字符（如 !@#$%）")
    return score, suggestions


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌已过期")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的令牌")


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def _resolve_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def _record_login_attempt(
    session: Session,
    user_id: int,
    request: Request,
    *,
    device: str = "unknown",
    location: str = "未知",
    login_status: str = "success",
) -> None:
    ip = _resolve_client_ip(request)
    ua = request.headers.get("user-agent", "")
    record = LoginHistory(
        user_id=user_id,
        ip_address=ip,
        device=device[:128] if device else None,
        location=location[:128] if location else None,
        user_agent=ua[:500] if ua else None,
        status=login_status,
    )
    session.add(record)


def _record_audit(
    session: Session,
    user_id: Optional[int],
    action: str,
    target: Optional[str] = None,
    detail: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    ip = _resolve_client_ip(request) if request else None
    audit = AuditLog(
        user_id=user_id,
        action=action,
        target=target,
        detail=detail,
        ip_address=ip,
    )
    session.add(audit)


def register_user(
    session: Session,
    *,
    username: str,
    email: str,
    password: str,
    phone: Optional[str] = None,
) -> User:
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=409, detail="用户名已存在")
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=409, detail="邮箱已注册")
    now = datetime.utcnow().isoformat()
    user = User(
        username=username,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    profile = UserProfile(user_id=user.id, created_at=now, updated_at=now)
    settings_row = UserSettings(user_id=user.id, created_at=now, updated_at=now)
    session.add(profile)
    session.add(settings_row)
    session.commit()
    return user


def authenticate_user(
    session: Session,
    *,
    username_or_email: str,
    password: str,
) -> Optional[User]:
    user = session.exec(
        select(User).where((User.username == username_or_email) | (User.email == username_or_email))
    ).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_session),
) -> User:
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少访问令牌")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")
    user_id = int(payload["sub"])
    user = db.get(User, user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已被禁用")
    return user


def admin_or_self(current_user: User, target_user_id: int) -> None:
    """Simple permission helper: allow if current_user is target user. Admin roles can be extended."""
    if current_user.id != target_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="权限不足")
