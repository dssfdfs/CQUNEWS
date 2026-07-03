from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from .auth import _extract_bearer, decode_token, hash_password, verify_password
from .config import settings
from .database import AuditLog, CrawlLog, LoginHistory, News, User, UserProfile, UserSettings, engine
from .logger import logger
from .models import Admin, SystemConfig, UserActionLog, AIService, UserApiConfig

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class ApiKeyUpdateRequest(BaseModel):
    api_key: str = Field(min_length=10)


class UserInfoOut(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str]
    status: str
    created_at: str
    last_login_at: Optional[str]
    total_actions: int
    last_active: Optional[str]


class UserHistoryOut(BaseModel):
    id: int
    action_type: str
    action_label: str
    target_id: Optional[int]
    metadata: dict[str, Any]
    timestamp: str


class AnalyticsSummary(BaseModel):
    total_users: int
    today_active_users: int
    today_generate_count: int
    pending_feedback: int


class UserBehaviorData(BaseModel):
    dau: list[dict[str, Any]]
    action_distribution: list[dict[str, Any]]
    avg_duration: float
    duration_distribution: list[dict[str, Any]]
    total_records: int


class WordCloudData(BaseModel):
    words: list[dict[str, Any]]


class HeatmapData(BaseModel):
    heatmap: list[dict[str, Any]]
    weekdays: list[str]
    hours: list[int]


def get_admin_session() -> Session:
    return Session(engine)


def get_current_admin(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_admin_session),
) -> Admin:
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少访问令牌")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")
    admin_id = int(payload["sub"])
    admin = db.get(Admin, admin_id)
    if not admin or admin.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理员不存在或已被禁用")
    return admin


def _ensure_default_admin(db: Session) -> None:
    existing = db.exec(select(Admin).where(Admin.username == "admin")).first()
    if existing is not None:
        return
    admin = Admin(
        username="admin",
        password_hash=hash_password("admin123"),
        email="admin@cqunews.com",
        is_superuser=1,
        status="active",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(admin)
    db.commit()
    logger.info("Default admin created")


def _get_system_config(db: Session, key: str, default: str = "") -> str:
    config = db.exec(select(SystemConfig).where(SystemConfig.key == key)).first()
    if config:
        return config.value
    config = SystemConfig(key=key, value=default, created_at=datetime.utcnow().isoformat(), updated_at=datetime.utcnow().isoformat())
    db.add(config)
    db.commit()
    return default


def _set_system_config(db: Session, key: str, value: str) -> None:
    config = db.exec(select(SystemConfig).where(SystemConfig.key == key)).first()
    if config:
        config.value = value
        config.updated_at = datetime.utcnow().isoformat()
    else:
        config = SystemConfig(key=key, value=value, created_at=datetime.utcnow().isoformat(), updated_at=datetime.utcnow().isoformat())
        db.add(config)
    db.commit()


def _record_admin_audit(db: Session, admin_id: int, action: str, target: Optional[str] = None, detail: Optional[str] = None, request: Optional[Request] = None) -> None:
    ip = request.client.host if request and request.client else "127.0.0.1"
    audit = AuditLog(
        user_id=admin_id,
        action=f"admin.{action}",
        target=target,
        detail=detail,
        ip_address=ip,
    )
    db.add(audit)


@router.post("/auth/login", response_model=AdminLoginResponse)
def admin_login(req: AdminLoginRequest, request: Request, db: Session = Depends(get_admin_session)) -> AdminLoginResponse:
    _ensure_default_admin(db)
    admin = db.exec(select(Admin).where(Admin.username == req.username)).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if admin.status != "active":
        raise HTTPException(status_code=401, detail="管理员账号已被禁用")

    from .auth import create_access_token
    token = create_access_token(admin.id)
    admin.last_login_at = datetime.utcnow().isoformat()
    admin.updated_at = datetime.utcnow().isoformat()
    _record_admin_audit(db, admin.id, "login", target=admin.username, request=request)
    db.commit()

    return AdminLoginResponse(
        access_token=token,
        user={
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "is_superuser": bool(admin.is_superuser),
            "status": admin.status,
        },
    )


@router.get("/auth/me")
def admin_me(admin: Admin = Depends(get_current_admin)) -> dict[str, Any]:
    return {
        "id": admin.id,
        "username": admin.username,
        "email": admin.email,
        "is_superuser": bool(admin.is_superuser),
        "status": admin.status,
    }


@router.get("/users", response_model=dict[str, Any])
def list_users(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    stmt = select(User)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((col(User.username).like(like)) | (col(User.email).like(like)))
    if status:
        stmt = stmt.where(User.status == status)
    total = len(db.exec(stmt).all())
    offset = (page - 1) * page_size
    users = db.exec(stmt.order_by(User.id.desc()).offset(offset).limit(page_size)).all()

    result = []
    for user in users:
        action_count = len(db.exec(select(UserActionLog).where(UserActionLog.user_id == user.id)).all())
        last_action = db.exec(select(UserActionLog).where(UserActionLog.user_id == user.id).order_by(UserActionLog.id.desc()).limit(1)).first()
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "status": user.status,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "total_actions": action_count,
            "last_active": last_action.created_at if last_action else user.last_login_at,
        })

    return {"users": result, "total": total, "page": page, "page_size": page_size}


@router.get("/users/{user_id}", response_model=UserInfoOut)
def get_user(
    user_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> UserInfoOut:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    action_count = len(db.exec(select(UserActionLog).where(UserActionLog.user_id == user.id)).all())
    last_action = db.exec(select(UserActionLog).where(UserActionLog.user_id == user.id).order_by(UserActionLog.id.desc()).limit(1)).first()
    return UserInfoOut(
        id=user.id,
        username=user.username,
        email=user.email,
        phone=user.phone,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        total_actions=action_count,
        last_active=last_action.created_at if last_action else user.last_login_at,
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    db.exec(select(UserProfile).where(UserProfile.user_id == user_id)).all()
    db.exec(select(UserSettings).where(UserSettings.user_id == user_id)).all()
    db.exec(select(LoginHistory).where(LoginHistory.user_id == user_id)).all()
    db.exec(select(UserActionLog).where(UserActionLog.user_id == user_id)).all()

    db.delete(user)
    _record_admin_audit(db, admin.id, "delete_user", target=str(user_id), detail=f"username: {user.username}")
    db.commit()

    return {"success": True, "message": f"用户 {user.username} 已删除"}


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status: str = Query(..., pattern="^(active|disabled)$"),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.status = status
    user.updated_at = datetime.utcnow().isoformat()
    _record_admin_audit(db, admin.id, "update_user_status", target=str(user_id), detail=f"status: {status}")
    db.commit()
    return {"success": True, "status": status}


@router.get("/users/{user_id}/history", response_model=dict[str, Any])
def get_user_history(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    action_type: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    stmt = select(UserActionLog).where(UserActionLog.user_id == user_id)
    if action_type:
        stmt = stmt.where(UserActionLog.action_type == action_type)
    rows = db.exec(stmt.order_by(UserActionLog.id.desc()).limit(limit)).all()
    history = []
    for row in rows:
        metadata = {}
        if row.action_metadata:
            try:
                metadata = json.loads(row.action_metadata)
            except:
                pass
        history.append({
            "id": row.id,
            "action_type": row.action_type,
            "action_label": row.action_label,
            "target_id": row.target_id,
            "metadata": metadata,
            "timestamp": row.created_at,
        })
    return {"history": history, "total": len(history)}


@router.get("/config/default-api-key", response_model=dict[str, str])
def get_default_api_key(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, str]:
    api_key = _get_system_config(db, "default_api_key", "")
    return {"api_key": api_key}


@router.put("/config/default-api-key")
def update_default_api_key(
    req: ApiKeyUpdateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, str]:
    _set_system_config(db, "default_api_key", req.api_key)
    _record_admin_audit(db, admin.id, "update_api_key", target="system")
    db.commit()
    return {"api_key": req.api_key, "message": "API密钥已更新"}


@router.post("/config/test-api")
def test_api(
    req: ApiKeyUpdateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    try:
        import requests
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {req.api_key}"},
            json={"model": "deepseek-chat", "messages": [{"role": "user", "content": "ping"}]},
            timeout=10,
        )
        if response.status_code == 200:
            return {"success": True, "message": "API密钥验证成功"}
        else:
            return {"success": False, "message": f"API调用失败: {response.status_code}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> AnalyticsSummary:
    total_users = len(db.exec(select(User)).all())
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_active = len(db.exec(select(LoginHistory).where(col(LoginHistory.created_at).like(f"{today}%"))).all())
    today_generate = len(db.exec(select(UserActionLog).where((UserActionLog.action_type == "generate_summary") & col(UserActionLog.created_at).like(f"{today}%"))).all())
    pending_feedback = 0
    return AnalyticsSummary(
        total_users=total_users,
        today_active_users=today_active,
        today_generate_count=today_generate,
        pending_feedback=pending_feedback,
    )


@router.get("/analytics/user-behavior", response_model=UserBehaviorData)
def get_user_behavior(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> UserBehaviorData:
    days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    dau = []
    for i in range(7):
        date = (datetime.utcnow() - __import__("datetime").timedelta(days=6-i)).strftime("%Y-%m-%d")
        count = len(db.exec(select(LoginHistory).where(col(LoginHistory.created_at).like(f"{date}%"))).all())
        dau.append({"name": days[i], "value": count})

    actions = ["generate_summary", "generate_title", "view_news", "submit_feedback"]
    action_distribution = []
    for action in actions:
        count = len(db.exec(select(UserActionLog).where(UserActionLog.action_type == action)).all())
        labels = {"generate_summary": "生成摘要", "generate_title": "生成标题", "view_news": "查看新闻", "submit_feedback": "提交反馈"}
        action_distribution.append({"name": labels.get(action, action), "value": count})

    return UserBehaviorData(
        dau=dau,
        action_distribution=action_distribution,
        avg_duration=3.5,
        duration_distribution=[],
        total_records=len(db.exec(select(UserActionLog)).all()),
    )


@router.get("/analytics/word-cloud", response_model=WordCloudData)
def get_word_cloud(
    days: int = Query(7, ge=1, le=30),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> WordCloudData:
    words = [
        {"text": "新闻", "value": 100, "category": "时政"},
        {"text": "科技", "value": 85, "category": "科技"},
        {"text": "人工智能", "value": 75, "category": "科技"},
        {"text": "经济", "value": 70, "category": "财经"},
        {"text": "国际", "value": 65, "category": "国际"},
        {"text": "体育", "value": 60, "category": "体育"},
        {"text": "健康", "value": 55, "category": "健康"},
        {"text": "文化", "value": 50, "category": "综合"},
        {"text": "教育", "value": 45, "category": "综合"},
        {"text": "环保", "value": 40, "category": "综合"},
    ]
    return WordCloudData(words=words)


@router.get("/analytics/heatmap", response_model=HeatmapData)
def get_heatmap(
    days: int = Query(7, ge=1, le=30),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> HeatmapData:
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    hours = list(range(24))
    heatmap = []
    for wd in range(7):
        for h in range(24):
            heatmap.append({"weekday": weekdays[wd], "hour": h, "value": int(min(100, (h >= 8 and h <= 22) * (30 + __import__("random").random() * 70)))})
    return HeatmapData(heatmap=heatmap, weekdays=weekdays, hours=hours)


@router.get("/content", response_model=dict[str, Any])
def get_content_list(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    stmt = select(News)
    if status:
        status_map = {"pending": 0, "published": 1, "rejected": 2}
        stmt = stmt.where(News.crawl_status == status_map.get(status, News.crawl_status))
    if search:
        like = f"%{search}%"
        stmt = stmt.where((col(News.title).like(like)) | (col(News.source).like(like)))
    total = len(db.exec(stmt).all())
    offset = (page - 1) * page_size
    news_items = db.exec(stmt.order_by(News.id.desc()).offset(offset).limit(page_size)).all()

    data = []
    for news in news_items:
        status_labels = {0: "待审核", 1: "已发布", 2: "已拒绝"}
        data.append({
            "id": news.id,
            "title": news.title,
            "source": news.source,
            "category": news.category,
            "quality_score": 0,
            "review_status": status_labels.get(news.crawl_status, "未知"),
            "review_note": None,
            "crawl_status": news.crawl_status,
            "views": news.views,
            "created_at": news.created_at,
            "published_at": news.published_at,
        })

    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.get("/content/{news_id}", response_model=dict[str, Any])
def get_content_detail(
    news_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=404, detail="新闻不存在")
    status_labels = {0: "待审核", 1: "已发布", 2: "已拒绝"}
    return {
        "id": news.id,
        "title": news.title,
        "summary": news.summary,
        "content": news.content,
        "source": news.source,
        "category": news.category,
        "original_url": news.original_url,
        "published_at": news.published_at,
        "views": news.views,
        "is_trending": news.is_trending,
        "crawl_status": news.crawl_status,
        "review_status": status_labels.get(news.crawl_status, "未知"),
        "created_at": news.created_at,
        "updated_at": news.updated_at,
    }


@router.put("/content/{news_id}/approve")
def approve_content(
    news_id: int,
    note: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=404, detail="新闻不存在")
    news.crawl_status = 1
    news.updated_at = datetime.utcnow().isoformat()
    _record_admin_audit(db, admin.id, "approve_content", target=str(news_id))
    db.commit()
    return {"success": True, "message": "审核通过"}


@router.put("/content/{news_id}/reject")
def reject_content(
    news_id: int,
    note: str = Query(...),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=404, detail="新闻不存在")
    news.crawl_status = 2
    news.updated_at = datetime.utcnow().isoformat()
    _record_admin_audit(db, admin.id, "reject_content", target=str(news_id), detail=note)
    db.commit()
    return {"success": True, "message": "已拒绝"}


@router.get("/feedback", response_model=dict[str, Any])
def get_feedback(
    status: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    feedbacks = []
    return {"feedbacks": feedbacks, "total": 0}


@router.put("/feedback/{feedback_id}/resolve")
def resolve_feedback(
    feedback_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    return {"success": True, "message": "已处理"}


@router.get("/logs", response_model=dict[str, Any])
def get_logs(
    search: Optional[str] = None,
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    stmt = select(AuditLog)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((col(AuditLog.action).like(like)) | (col(AuditLog.target).like(like)))
    if action:
        stmt = stmt.where(AuditLog.action == action)
    total = len(db.exec(stmt).all())
    offset = (page - 1) * page_size
    rows = db.exec(stmt.order_by(AuditLog.id.desc()).offset(offset).limit(page_size)).all()

    data = []
    for row in rows:
        username = None
        if row.user_id:
            user = db.get(User, row.user_id)
            if user:
                username = user.username
        data.append({
            "id": row.id,
            "user_id": row.user_id,
            "username": username,
            "action": row.action,
            "target": row.target,
            "detail": row.detail,
            "ip_address": row.ip_address,
            "created_at": row.created_at,
        })

    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.post("/export/users")
def export_users(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
):
    from fastapi.responses import FileResponse
    db_path = settings.DB_PATH
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="数据库文件不存在")
    _record_admin_audit(db, admin.id, "export_users", target="all")
    db.commit()
    return FileResponse(
        path=db_path,
        filename="backup.db",
        media_type="application/octet-stream",
    )


@router.post("/analyze/url")
def analyze_url(
    url: str = Query(...),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    from .crawler import _session, fetch_article
    try:
        session = _session()
        result = fetch_article(session, url, "admin_analyze", "")
        if result:
            return {"success": True, "title": result.title, "content": result.content, "summary": result.summary}
        else:
            return {"success": False, "error": "无法解析该网页"}
    except Exception as e:
        return {"success": False, "error": str(e)}


class AIServiceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    display_name: str = Field(min_length=2, max_length=128)
    api_url: str = Field(min_length=10, max_length=500)
    default_model: str = Field(min_length=2, max_length=128)
    description: Optional[str] = Field(default=None, max_length=500)


class AIServiceUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=128)
    api_url: Optional[str] = Field(default=None, max_length=500)
    default_model: Optional[str] = Field(default=None, max_length=128)
    description: Optional[str] = Field(default=None, max_length=500)
    enabled: Optional[int] = Field(default=None, ge=0, le=1)


class UserApiConfigCreateRequest(BaseModel):
    user_id: int = Field(gt=0)
    service_id: int = Field(gt=0)
    api_key: str = Field(min_length=10, max_length=500)
    api_url: Optional[str] = Field(default=None, max_length=500)
    model_name: Optional[str] = Field(default=None, max_length=128)
    is_default: int = Field(default=0, ge=0, le=1)


class UserApiConfigUpdateRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, max_length=500)
    api_url: Optional[str] = Field(default=None, max_length=500)
    model_name: Optional[str] = Field(default=None, max_length=128)
    enabled: Optional[int] = Field(default=None, ge=0, le=1)
    is_default: Optional[int] = Field(default=None, ge=0, le=1)


@router.get("/api-services", response_model=dict[str, Any])
def list_ai_services(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    services = db.exec(select(AIService).order_by(AIService.id.asc())).all()
    return {"services": [s.model_dump() for s in services]}


@router.get("/api-services/{service_id}", response_model=dict[str, Any])
def get_ai_service(
    service_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    service = db.get(AIService, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="AI服务不存在")
    return service.model_dump()


@router.post("/api-services", response_model=dict[str, Any])
def create_ai_service(
    req: AIServiceCreateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    existing = db.exec(select(AIService).where(AIService.name == req.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="AI服务名称已存在")
    
    service = AIService(
        name=req.name,
        display_name=req.display_name,
        api_url=req.api_url,
        default_model=req.default_model,
        description=req.description,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(service)
    _record_admin_audit(db, admin.id, "create_ai_service", target=req.name)
    db.commit()
    db.refresh(service)
    
    return {"success": True, "service": service.model_dump()}


@router.put("/api-services/{service_id}", response_model=dict[str, Any])
def update_ai_service(
    service_id: int,
    req: AIServiceUpdateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    service = db.get(AIService, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="AI服务不存在")
    
    if req.display_name:
        service.display_name = req.display_name
    if req.api_url:
        service.api_url = req.api_url
    if req.default_model:
        service.default_model = req.default_model
    if req.description is not None:
        service.description = req.description
    if req.enabled is not None:
        service.enabled = req.enabled
    service.updated_at = datetime.utcnow().isoformat()
    
    _record_admin_audit(db, admin.id, "update_ai_service", target=str(service_id))
    db.commit()
    
    return {"success": True, "service": service.model_dump()}


@router.delete("/api-services/{service_id}", response_model=dict[str, Any])
def delete_ai_service(
    service_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    service = db.get(AIService, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="AI服务不存在")
    
    config_count = len(db.exec(select(UserApiConfig).where(UserApiConfig.service_id == service_id)).all())
    if config_count > 0:
        raise HTTPException(status_code=400, detail=f"该服务下还有 {config_count} 个用户配置，无法删除")
    
    db.delete(service)
    _record_admin_audit(db, admin.id, "delete_ai_service", target=service.name)
    db.commit()
    
    return {"success": True, "message": f"AI服务 {service.display_name} 已删除"}


@router.get("/user-api-configs", response_model=dict[str, Any])
def list_user_api_configs(
    user_id: Optional[int] = Query(None, gt=0),
    service_id: Optional[int] = Query(None, gt=0),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    stmt = select(UserApiConfig)
    if user_id:
        stmt = stmt.where(UserApiConfig.user_id == user_id)
    if service_id:
        stmt = stmt.where(UserApiConfig.service_id == service_id)
    
    configs = db.exec(stmt.order_by(UserApiConfig.id.desc())).all()
    
    result = []
    for config in configs:
        user = db.get(User, config.user_id)
        service = db.get(AIService, config.service_id)
        result.append({
            "id": config.id,
            "user_id": config.user_id,
            "username": user.username if user else None,
            "user_email": user.email if user else None,
            "service_id": config.service_id,
            "service_name": service.display_name if service else None,
            "service_code": service.name if service else None,
            "api_key": "******" + config.api_key[-8:] if config.api_key else None,
            "api_url": config.api_url,
            "model_name": config.model_name,
            "enabled": bool(config.enabled),
            "is_default": bool(config.is_default),
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        })
    
    return {"configs": result, "total": len(result)}


@router.get("/user-api-configs/{config_id}", response_model=dict[str, Any])
def get_user_api_config(
    config_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    config = db.get(UserApiConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="用户API配置不存在")
    
    user = db.get(User, config.user_id)
    service = db.get(AIService, config.service_id)
    
    return {
        "id": config.id,
        "user_id": config.user_id,
        "username": user.username if user else None,
        "service_id": config.service_id,
        "service_name": service.display_name if service else None,
        "api_key": config.api_key,
        "api_url": config.api_url,
        "model_name": config.model_name,
        "enabled": bool(config.enabled),
        "is_default": bool(config.is_default),
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }


@router.post("/user-api-configs", response_model=dict[str, Any])
def create_user_api_config(
    req: UserApiConfigCreateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    user = db.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    service = db.get(AIService, req.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="AI服务不存在")
    
    existing = db.exec(select(UserApiConfig).where(
        (UserApiConfig.user_id == req.user_id) & (UserApiConfig.service_id == req.service_id)
    )).first()
    if existing:
        raise HTTPException(status_code=400, detail="该用户已配置此服务")
    
    if req.is_default:
        db.exec(select(UserApiConfig).where(UserApiConfig.user_id == req.user_id)).all()
        for cfg in db.exec(select(UserApiConfig).where(UserApiConfig.user_id == req.user_id)).all():
            cfg.is_default = 0
    
    config = UserApiConfig(
        user_id=req.user_id,
        service_id=req.service_id,
        api_key=req.api_key,
        api_url=req.api_url,
        model_name=req.model_name,
        is_default=req.is_default,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(config)
    _record_admin_audit(db, admin.id, "create_user_api_config", target=f"user:{req.user_id}")
    db.commit()
    db.refresh(config)
    
    return {"success": True, "config": {
        "id": config.id,
        "user_id": config.user_id,
        "service_id": config.service_id,
        "api_key": "******" + config.api_key[-8:],
        "api_url": config.api_url,
        "model_name": config.model_name,
        "enabled": bool(config.enabled),
        "is_default": bool(config.is_default),
    }}


@router.put("/user-api-configs/{config_id}", response_model=dict[str, Any])
def update_user_api_config(
    config_id: int,
    req: UserApiConfigUpdateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    config = db.get(UserApiConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="用户API配置不存在")
    
    if req.api_key:
        config.api_key = req.api_key
    if req.api_url is not None:
        config.api_url = req.api_url
    if req.model_name is not None:
        config.model_name = req.model_name
    if req.enabled is not None:
        config.enabled = req.enabled
    if req.is_default is not None:
        if req.is_default:
            for cfg in db.exec(select(UserApiConfig).where(UserApiConfig.user_id == config.user_id)).all():
                cfg.is_default = 0
        config.is_default = req.is_default
    config.updated_at = datetime.utcnow().isoformat()
    
    _record_admin_audit(db, admin.id, "update_user_api_config", target=str(config_id))
    db.commit()
    
    return {"success": True, "message": "用户API配置已更新"}


@router.delete("/user-api-configs/{config_id}", response_model=dict[str, Any])
def delete_user_api_config(
    config_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    config = db.get(UserApiConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="用户API配置不存在")
    
    db.delete(config)
    _record_admin_audit(db, admin.id, "delete_user_api_config", target=str(config_id))
    db.commit()
    
    return {"success": True, "message": "用户API配置已删除"}


@router.post("/user-api-configs/{config_id}/test", response_model=dict[str, Any])
def test_user_api_config(
    config_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_admin_session),
) -> dict[str, Any]:
    config = db.get(UserApiConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="用户API配置不存在")
    
    service = db.get(AIService, config.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="AI服务不存在")
    
    api_url = config.api_url or service.api_url
    model_name = config.model_name or service.default_model
    api_key = config.api_key
    
    try:
        import httpx
        
        async def test_api():
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    api_url,
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": "ping"}],
                        "temperature": 0.7,
                        "max_tokens": 50,
                    },
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                return response
        
        import asyncio
        response = asyncio.run(test_api())
        
        if response.is_success:
            return {"success": True, "message": "API密钥验证成功"}
        else:
            return {"success": False, "message": f"API调用失败: {response.status_code}"}
    
    except Exception as e:
        return {"success": False, "message": str(e)}