from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, col, select

from .auth import (
    _record_audit,
    _record_login_attempt,
    authenticate_user,
    check_password_strength,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    register_user,
    verify_password,
)
from .database import get_session
from .logger import logger
from .models import (
    AuditLog,
    ExportJob,
    LoginHistory,
    Notification,
    User,
    UserProfile,
    UserProfileHistory,
    UserSettings,
)
from .user_services import (
    FONT_SIZE_OPTIONS,
    FONT_SIZE_VALUES,
    LANGUAGE_OPTIONS,
    THEME_MODE_OPTIONS,
    THEME_PRESETS,
    build_user_export_payload,
    cleanup_expired_exports,
    delete_avatar_file,
    generate_export_file,
    get_export_download_path,
    process_avatar,
    save_avatar_file,
)


router = APIRouter(prefix="/api", tags=["UserSettings"])


USERNAME_RE = re.compile(r"^[A-Za-z0-9_\u4e00-\u9fa5]{3,32}$")


# =============== Schemas ===============


class ApiResponse(BaseModel):
    code: int = 0
    message: str = "ok"
    data: Optional[Any] = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = None


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: str


class LoginRequest(BaseModel):
    account: str = Field(min_length=3, max_length=128)
    password: str
    two_factor_code: Optional[str] = None
    device: str = "unknown"
    location: str = "未知"


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]
    requires_2fa: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


class Enable2FAResponse(BaseModel):
    secret: str
    qr_code_data_url: str
    backup_codes: list[str]


class Enable2FARequest(BaseModel):
    code: str


class Disable2FARequest(BaseModel):
    password: str


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = Field(default=None, max_length=64)
    bio: Optional[str] = Field(default=None, max_length=500)
    gender: Optional[str] = Field(default=None, pattern="^(male|female|other)$")
    birthday: Optional[str] = Field(default=None, max_length=16)


class UsernameUpdateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)


class AppearanceUpdateRequest(BaseModel):
    theme_mode: Optional[str] = Field(default=None, pattern="^(light|dark)$")
    theme_color: Optional[str] = Field(default=None, max_length=16)
    font_size: Optional[str] = Field(
        default=None, pattern="^(xs|sm|medium|lg|xl)$"
    )


class LanguageUpdateRequest(BaseModel):
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    number_format: Optional[str] = None


class NotificationUpdateRequest(BaseModel):
    notify_system: Optional[bool] = None
    notify_message: Optional[bool] = None
    notify_marketing: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None
    notify_in_app: Optional[bool] = None
    notify_frequency: Optional[str] = Field(
        default=None, pattern="^(realtime|hourly|daily|weekly|off)$"
    )


class LogoutResponse(BaseModel):
    success: bool


class ExportResponse(BaseModel):
    job_id: int
    format: str
    status: str


class DeactivateRequest(BaseModel):
    confirm: bool = False
    password: str


# =============== Helpers ===============


def _get_user_data(session: Session, user_id: int) -> tuple[User, UserProfile, UserSettings]:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    if not profile:
        profile = UserProfile(user_id=user_id, created_at=user.created_at, updated_at=user.updated_at)
        session.add(profile)
    settings_row = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings_row:
        settings_row = UserSettings(user_id=user_id, created_at=user.created_at, updated_at=user.updated_at)
        session.add(settings_row)
    session.commit()
    session.refresh(profile)
    session.refresh(settings_row)
    return user, profile, settings_row


def _format_user(user: User, profile: Optional[UserProfile] = None) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "status": user.status,
        "nickname": profile.nickname if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "bio": profile.bio if profile else None,
        "created_at": user.created_at,
    }


# =============== Auth ===============


@router.post("/auth/register", response_model=ApiResponse)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_session)) -> ApiResponse:
    if not USERNAME_RE.match(req.username):
        raise HTTPException(status_code=400, detail="用户名仅支持字母、数字、下划线和中文，长度 3-32 位")
    score, suggestions = check_password_strength(req.password)
    if score < 1:
        raise HTTPException(status_code=400, detail=f"密码强度不足：{';'.join(suggestions)}")
    user = register_user(
        db,
        username=req.username,
        email=req.email,
        password=req.password,
        phone=req.phone,
    )
    _record_audit(db, user.id, "auth.register", target=req.username, request=request)
    db.commit()
    return ApiResponse(data=RegisterResponse(id=user.id, username=user.username, email=user.email).model_dump())


@router.post("/auth/login", response_model=ApiResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_session)) -> ApiResponse:
    user = authenticate_user(db, username_or_email=req.account, password=req.password)
    if not user:
        _record_login_attempt(db, 0, request, device=req.device, location=req.location, login_status="failed")
        db.commit()
        raise HTTPException(status_code=401, detail="账号或密码错误")

    settings_row = db.exec(select(UserSettings).where(UserSettings.user_id == user.id)).first()
    if settings_row and settings_row.two_factor_enabled:
        if not req.two_factor_code:
            db.commit()
            return ApiResponse(
                code=0,
                message="需要 2FA 验证",
                data=LoginResponse(
                    access_token="",
                    refresh_token="",
                    user=_format_user(user),
                    requires_2fa=True,
                ).model_dump(),
            )
        from .user_services import _verify_2fa_code

        if not _verify_2fa_code(settings_row.two_factor_secret or "", req.two_factor_code):
            _record_login_attempt(db, user.id, request, device=req.device, location=req.location, login_status="failed")
            db.commit()
            raise HTTPException(status_code=401, detail="2FA 验证码错误")

    user.last_login_at = datetime.utcnow().isoformat()
    user.updated_at = datetime.utcnow().isoformat()
    _record_login_attempt(db, user.id, request, device=req.device, location=req.location)
    _record_audit(db, user.id, "auth.login", target=user.username, request=request)
    db.commit()

    profile = db.exec(select(UserProfile).where(UserProfile.user_id == user.id)).first()
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    return ApiResponse(
        data=LoginResponse(
            access_token=access,
            refresh_token=refresh,
            user=_format_user(user, profile),
        ).model_dump()
    )


@router.post("/auth/refresh", response_model=ApiResponse)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_session)) -> ApiResponse:
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="无效的刷新令牌")
    user = db.get(User, int(payload["sub"]))
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="用户不存在")
    return ApiResponse(
        data={
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
            "token_type": "bearer",
        }
    )


@router.post("/auth/logout", response_model=ApiResponse)
def logout(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _record_audit(db, user.id, "auth.logout", target=user.username, request=request)
    db.commit()
    return ApiResponse(data=LogoutResponse(success=True).model_dump())


# =============== Profile ===============


@router.get("/settings/profile", response_model=ApiResponse)
def get_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    user_row, profile, settings_row = _get_user_data(db, user.id)
    return ApiResponse(
        data={
            "user": _format_user(user_row, profile),
            "profile": profile.model_dump(exclude={"id", "user_id"}),
            "settings": {
                "theme_mode": settings_row.theme_mode,
                "theme_color": settings_row.theme_color,
                "font_size": settings_row.font_size,
                "language": settings_row.language,
                "timezone": settings_row.timezone,
                "date_format": settings_row.date_format,
                "time_format": settings_row.time_format,
                "number_format": settings_row.number_format,
            },
        }
    )


@router.put("/settings/profile", response_model=ApiResponse)
def update_profile(
    req: ProfileUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, profile, _ = _get_user_data(db, user.id)
    now = datetime.utcnow().isoformat()

    changes: list[tuple[str, str, str]] = []
    if req.nickname is not None:
        if len(req.nickname) > 64:
            raise HTTPException(status_code=400, detail="昵称长度不能超过 64 位")
        if profile.nickname != req.nickname:
            changes.append(("nickname", profile.nickname or "", req.nickname))
            profile.nickname = req.nickname
    if req.bio is not None:
        if profile.bio != req.bio:
            changes.append(("bio", profile.bio or "", req.bio))
            profile.bio = req.bio
    if req.gender is not None:
        if profile.gender != req.gender:
            changes.append(("gender", profile.gender or "", req.gender))
            profile.gender = req.gender
    if req.birthday is not None:
        if profile.birthday != req.birthday:
            changes.append(("birthday", profile.birthday or "", req.birthday))
            profile.birthday = req.birthday

    for field, old, new in changes:
        db.add(
            UserProfileHistory(
                user_id=user.id,
                changed_field=field,
                old_value=old,
                new_value=new,
                created_at=now,
            )
        )

    profile.updated_at = now
    _record_audit(db, user.id, "settings.update_profile", target="profile", detail=str(changes), request=request)
    db.commit()
    db.refresh(profile)
    return ApiResponse(data=profile.model_dump(exclude={"id", "user_id"}))


@router.put("/settings/profile/username", response_model=ApiResponse)
def update_username(
    req: UsernameUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    if not USERNAME_RE.match(req.username):
        raise HTTPException(status_code=400, detail="用户名仅支持字母、数字、下划线和中文，长度 3-32 位")
    if req.username == user.username:
        raise HTTPException(status_code=400, detail="新用户名与原用户名相同")
    existing = db.exec(select(User).where(User.username == req.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="用户名已被占用")

    old = user.username
    user.username = req.username
    user.updated_at = datetime.utcnow().isoformat()
    _, profile, _ = _get_user_data(db, user.id)
    db.add(
        UserProfileHistory(
            user_id=user.id,
            changed_field="username",
            old_value=old,
            new_value=req.username,
            created_at=user.updated_at,
        )
    )
    _record_audit(db, user.id, "settings.update_username", target=old, detail=f"{old}->{req.username}", request=request)
    db.commit()
    db.refresh(user)
    return ApiResponse(data={"username": user.username})


@router.post("/settings/profile/avatar", response_model=ApiResponse)
async def upload_avatar(
    request: Request,
    user: User = Depends(get_current_user),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> ApiResponse:
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="文件为空")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件过大，最大 5MB")
    ext = (file.filename or "png").rsplit(".", 1)[-1].lower()
    if ext not in ["png", "jpg", "jpeg", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="不支持的图片格式")

    try:
        data, fmt, w, h = process_avatar(content, ext)
    except Exception as e:  # noqa: BLE001
        logger.exception("Avatar processing failed: %s", e)
        raise HTTPException(status_code=400, detail="图片处理失败，请使用有效的图片文件")

    path, size = save_avatar_file(user.id, data, fmt)

    _, profile, _ = _get_user_data(db, user.id)
    old_url = profile.avatar_url
    profile.avatar_url = path
    profile.updated_at = datetime.utcnow().isoformat()
    db.add(
        UserProfileHistory(
            user_id=user.id,
            changed_field="avatar_url",
            old_value=old_url or "",
            new_value=path,
            created_at=profile.updated_at,
        )
    )
    _record_audit(db, user.id, "settings.upload_avatar", target=path, request=request)
    db.commit()

    if old_url and old_url != path:
        delete_avatar_file(old_url)

    return ApiResponse(
        data={
            "avatar_url": path,
            "width": w,
            "height": h,
            "size_bytes": size,
            "format": fmt,
        }
    )


@router.get("/settings/profile/history", response_model=ApiResponse)
def get_profile_history(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    rows = db.exec(
        select(UserProfileHistory)
        .where(UserProfileHistory.user_id == user.id)
        .order_by(UserProfileHistory.id.desc())  # type: ignore[attr-defined]
        .limit(limit)
    ).all()
    return ApiResponse(data=[r.model_dump() for r in rows])


# =============== Appearance ===============


@router.get("/settings/appearance", response_model=ApiResponse)
def get_appearance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    return ApiResponse(
        data={
            "theme_mode": s.theme_mode,
            "theme_color": s.theme_color,
            "font_size": s.font_size,
            "font_size_value": FONT_SIZE_VALUES.get(s.font_size, 16),
            "theme_modes": [
                {"key": k, "label": v} for k, v in THEME_MODE_OPTIONS.items()
            ],
            "presets": THEME_PRESETS,
            "font_sizes": [
                {
                    "key": k,
                    "label": v["label"],
                    "value": v["value"],
                }
                for k, v in FONT_SIZE_OPTIONS.items()
            ],
        }
    )


@router.put("/settings/appearance", response_model=ApiResponse)
def update_appearance(
    req: AppearanceUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    if req.theme_mode is not None:
        if req.theme_mode not in THEME_MODE_OPTIONS:
            raise HTTPException(status_code=400, detail="不支持的主题模式")
        s.theme_mode = req.theme_mode
    if req.theme_color is not None:
        if not re.match(r"^#([0-9a-fA-F]{6})$", req.theme_color):
            raise HTTPException(status_code=400, detail="主题颜色格式无效，请使用 #RRGGBB")
        s.theme_color = req.theme_color
    if req.font_size is not None:
        if req.font_size not in FONT_SIZE_OPTIONS:
            raise HTTPException(status_code=400, detail="不支持的字号选项")
        s.font_size = req.font_size
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.update_appearance", request=request)
    db.commit()
    return ApiResponse(
        data={
            "theme_mode": s.theme_mode,
            "theme_color": s.theme_color,
            "font_size": s.font_size,
            "font_size_value": FONT_SIZE_VALUES.get(s.font_size, 16),
        }
    )


# =============== Language ===============


@router.get("/settings/language", response_model=ApiResponse)
def get_language(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    return ApiResponse(
        data={
            "language": s.language,
            "timezone": s.timezone,
            "date_format": s.date_format,
            "time_format": s.time_format,
            "number_format": s.number_format,
            "supported_languages": [
                {"code": k, "label": v} for k, v in LANGUAGE_OPTIONS.items()
            ],
        }
    )


@router.put("/settings/language", response_model=ApiResponse)
def update_language(
    req: LanguageUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    if req.language is not None:
        if req.language not in LANGUAGE_OPTIONS:
            raise HTTPException(status_code=400, detail="不支持的语言代码")
        s.language = req.language
    if req.timezone is not None:
        s.timezone = req.timezone
    if req.date_format is not None:
        s.date_format = req.date_format
    if req.time_format is not None:
        s.time_format = req.time_format
    if req.number_format is not None:
        s.number_format = req.number_format
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.update_language", request=request)
    db.commit()
    return ApiResponse(
        data={
            "language": s.language,
            "timezone": s.timezone,
            "date_format": s.date_format,
            "time_format": s.time_format,
            "number_format": s.number_format,
        }
    )


# =============== Security ===============


@router.put("/settings/security/password", response_model=ApiResponse)
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    if not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码错误")
    score, suggestions = check_password_strength(req.new_password)
    if score < 2:
        raise HTTPException(
            status_code=400,
            detail=f"新密码强度不足：{';'.join(suggestions)}",
        )
    user.password_hash = hash_password(req.new_password)
    user.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.change_password", request=request)
    db.commit()
    return ApiResponse(data={"strength_score": score, "suggestions": suggestions})


@router.post("/settings/security/2fa/enable", response_model=ApiResponse)
def enable_2fa(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    from .user_services import enable_2fa_setup_payload

    _, _, s = _get_user_data(db, user.id)
    if s.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA 已启用")
    payload = enable_2fa_setup_payload(user.id, user.username)
    s.two_factor_secret = payload["secret"]
    s.two_factor_enabled = 0
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.enable_2fa.init", request=request)
    db.commit()
    return ApiResponse(data=payload)


@router.post("/settings/security/2fa/confirm", response_model=ApiResponse)
def confirm_2fa(
    req: Enable2FARequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    from .user_services import _verify_2fa_code

    _, _, s = _get_user_data(db, user.id)
    if not s.two_factor_secret:
        raise HTTPException(status_code=400, detail="请先初始化 2FA")
    if not _verify_2fa_code(s.two_factor_secret, req.code):
        raise HTTPException(status_code=400, detail="验证码错误")
    s.two_factor_enabled = 1
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.enable_2fa.confirm", request=request)
    db.commit()
    return ApiResponse(data={"enabled": True})


@router.post("/settings/security/2fa/disable", response_model=ApiResponse)
def disable_2fa(
    req: Disable2FARequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="密码错误")
    _, _, s = _get_user_data(db, user.id)
    s.two_factor_enabled = 0
    s.two_factor_secret = None
    s.two_factor_backup_codes = None
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.disable_2fa", request=request)
    db.commit()
    return ApiResponse(data={"enabled": False})


@router.get("/settings/security/login-history", response_model=ApiResponse)
def get_login_history(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    rows = db.exec(
        select(LoginHistory)
        .where(LoginHistory.user_id == user.id)
        .order_by(LoginHistory.id.desc())  # type: ignore[attr-defined]
        .limit(limit)
    ).all()
    return ApiResponse(
        data={
            "total": len(rows),
            "items": [r.model_dump() for r in rows],
        }
    )


@router.get("/settings/security/audit-log", response_model=ApiResponse)
def get_audit_log(
    action: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    stmt = select(AuditLog).where(AuditLog.user_id == user.id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    rows = db.exec(stmt.order_by(AuditLog.id.desc()).limit(limit)).all()  # type: ignore[attr-defined]
    return ApiResponse(data=[r.model_dump() for r in rows])


# =============== Notifications ===============


@router.get("/settings/notifications", response_model=ApiResponse)
def get_notification_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    unread = len(
        db.exec(
            select(Notification).where(
                (Notification.user_id == user.id) & (Notification.is_read == 0)
            )
        ).all()
    )
    return ApiResponse(
        data={
            "prefs": {
                "system": bool(s.notify_system),
                "message": bool(s.notify_message),
                "marketing": bool(s.notify_marketing),
                "channels": {
                    "email": bool(s.notify_email),
                    "sms": bool(s.notify_sms),
                    "in_app": bool(s.notify_in_app),
                },
                "frequency": s.notify_frequency,
            },
            "unread_count": unread,
        }
    )


@router.put("/settings/notifications", response_model=ApiResponse)
def update_notification_settings(
    req: NotificationUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, _, s = _get_user_data(db, user.id)
    if req.notify_system is not None:
        s.notify_system = int(req.notify_system)
    if req.notify_message is not None:
        s.notify_message = int(req.notify_message)
    if req.notify_marketing is not None:
        s.notify_marketing = int(req.notify_marketing)
    if req.notify_email is not None:
        s.notify_email = int(req.notify_email)
    if req.notify_sms is not None:
        s.notify_sms = int(req.notify_sms)
    if req.notify_in_app is not None:
        s.notify_in_app = int(req.notify_in_app)
    if req.notify_frequency is not None:
        s.notify_frequency = req.notify_frequency
    s.updated_at = datetime.utcnow().isoformat()
    _record_audit(db, user.id, "settings.update_notifications", request=request)
    db.commit()
    return ApiResponse(
        data={
            "notify_system": bool(s.notify_system),
            "notify_message": bool(s.notify_message),
            "notify_marketing": bool(s.notify_marketing),
            "notify_email": bool(s.notify_email),
            "notify_sms": bool(s.notify_sms),
            "notify_in_app": bool(s.notify_in_app),
            "notify_frequency": s.notify_frequency,
        }
    )


@router.get("/settings/notifications/list", response_model=ApiResponse)
def list_notifications(
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if category:
        stmt = stmt.where(Notification.category == category)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == (0 if not is_read else 1))
    rows = db.exec(stmt.order_by(Notification.id.desc()).limit(limit)).all()  # type: ignore[attr-defined]
    return ApiResponse(data=[r.model_dump() for r in rows])


@router.post("/settings/notifications/{notify_id}/read", response_model=ApiResponse)
def mark_notification_read(
    notify_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    n = db.get(Notification, notify_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="通知不存在")
    n.is_read = 1
    db.commit()
    return ApiResponse(data={"is_read": True})


# =============== Data Management ===============


@router.get("/settings/data/storage", response_model=ApiResponse)
def get_storage_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    _, profile, s = _get_user_data(db, user.id)

    avatar_size = 0
    if profile.avatar_url:
        from pathlib import Path as P

        p = P(settings.UPLOAD_DIR) / profile.avatar_url.removeprefix("/uploads/").lstrip("/")
        if p.exists():
            avatar_size = p.stat().st_size

    export_size = 0
    export_count = 0
    from pathlib import Path as P

    export_dir = P(settings.EXPORT_DIR)
    if export_dir.exists():
        for f in export_dir.glob("user_*_export_*.*"):
            if f.is_file():
                try:
                    export_size += f.stat().st_size
                    export_count += 1
                except OSError:
                    pass

    history_count = len(
        db.exec(
            select(UserProfileHistory).where(UserProfileHistory.user_id == user.id)
        ).all()
    )
    notify_count = len(
        db.exec(select(Notification).where(Notification.user_id == user.id)).all()
    )
    login_count = len(
        db.exec(select(LoginHistory).where(LoginHistory.user_id == user.id)).all()
    )

    total = avatar_size + export_size + s.storage_used_bytes

    return ApiResponse(
        data={
            "total_bytes": total,
            "avatar_bytes": avatar_size,
            "export_bytes": export_size,
            "export_count": export_count,
            "profile_history_count": history_count,
            "notification_count": notify_count,
            "login_history_count": login_count,
        }
    )


@router.post("/settings/data/export", response_model=ApiResponse)
def request_export(
    request: Request,
    fmt: str = Query("json", pattern="^(json|csv)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    user_row, profile, s = _get_user_data(db, user.id)
    path, filename, size = generate_export_file(user_row, profile, s, fmt)
    expires = (datetime.utcnow() + __import__("datetime").timedelta(hours=24)).isoformat()
    job = ExportJob(
        user_id=user.id,
        format=fmt,
        status="completed",
        file_path=path,
        file_size=size,
        expires_at=expires,
        created_at=datetime.utcnow().isoformat(),
        completed_at=datetime.utcnow().isoformat(),
    )
    db.add(job)
    _record_audit(db, user.id, "settings.data.export", target=filename, request=request)
    db.commit()
    return ApiResponse(
        data={
            "job_id": job.id,
            "filename": filename,
            "format": fmt,
            "size_bytes": size,
            "expires_at": expires,
        }
    )


@router.get("/settings/data/download/{filename}")
def download_export(
    filename: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    safe = __import__("os").path.basename(filename)
    job = db.exec(
        select(ExportJob).where((ExportJob.file_path != None) & (ExportJob.file_path.like(f"%{safe}%")))  # type: ignore[attr-defined]
    ).first()
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="导出文件不存在或无权限")
    path = get_export_download_path(safe)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件已过期")
    return FileResponse(
        path=str(path),
        filename=safe,
        media_type="application/octet-stream",
    )


@router.post("/settings/data/deactivate", response_model=ApiResponse)
def deactivate_account(
    req: DeactivateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    if not req.confirm:
        raise HTTPException(status_code=400, detail="请确认操作")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="密码错误")

    # Full data cleanup
    db.exec(select(Notification).where(Notification.user_id == user.id)).all()
    db.exec(select(AuditLog).where(AuditLog.user_id == user.id)).all()
    db.exec(select(LoginHistory).where(LoginHistory.user_id == user.id)).all()
    db.exec(select(UserProfileHistory).where(UserProfileHistory.user_id == user.id)).all()

    profile = db.exec(select(UserProfile).where(UserProfile.user_id == user.id)).first()
    if profile and profile.avatar_url:
        delete_avatar_file(profile.avatar_url)

    db.delete(user)
    db.commit()

    _record_audit(db, user.id, "settings.data.deactivate", target=user.username, request=request)
    db.commit()

    return ApiResponse(data={"success": True})


@router.post("/settings/data/cleanup", response_model=ApiResponse)
def cleanup_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ApiResponse:
    deleted = cleanup_expired_exports()
    # Trim old login history to the last 30 days
    thirty_days_ago = (
        __import__("datetime").datetime.utcnow() - __import__("datetime").timedelta(days=30)
    ).isoformat()
    old_logins = db.exec(
        select(LoginHistory).where(
            (LoginHistory.user_id == user.id) & (col(LoginHistory.created_at) < thirty_days_ago)
        )
    ).all()
    for r in old_logins:
        db.delete(r)
    db.commit()
    return ApiResponse(data={"deleted_exports": deleted, "deleted_login_records": len(old_logins)})
