from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from .admin import get_admin_user, AdminUser
from .database import CrawlLog, CrawlSource, News, engine
from .logger import logger
from .models import User, UserBehavior
from .scheduler import trigger_crawl_now, _job


def contains_garbled_text(text: str) -> bool:
    if not text:
        return False
    
    garbled_patterns = [
        r'[\uFFFD]',
        r'[\uD800-\uDFFF]',
        r'(?:[âãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]{3,})',
    ]
    
    for pattern in garbled_patterns:
        if re.search(pattern, text):
            return True
    
    chinese_pattern = r'[\u4e00-\u9fff]'
    chinese_count = len(re.findall(chinese_pattern, text))
    total_count = len(text)
    
    if total_count > 30 and chinese_count == 0:
        weird_pattern = r'[^\x20-\x7e\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]'
        weird_count = len(re.findall(weird_pattern, text))
        if weird_count > 15:
            return True
    
    if chinese_count > 0:
        mojibake_pattern = r'[\xa0-\xff]{8,}'
        if re.search(mojibake_pattern, text):
            return True
    
    return False


router = APIRouter(prefix="/api", tags=["CQUNEWS"])


class NewsItemOut(BaseModel):
    id: int
    title: str
    summary: str | None
    content: str | None
    category: str | None
    source: str | None
    original_url: str
    published_at: str | None
    views: int
    is_trending: bool
    created_at: str | None


class NewsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[NewsItemOut]


class CrawlRunRequest(BaseModel):
    source_ids: list[int] = Field(default_factory=list)
    max_articles_per_source: int = 15


class CrawlRunResponse(BaseModel):
    triggered: bool
    message: str
    started_at: str


class CrawlSourceOut(BaseModel):
    id: int
    name: str
    url: str
    category: str | None
    enabled: int
    last_crawl_at: str | None


class CrawlLogOut(BaseModel):
    id: int
    source_id: int | None
    source_name: str | None
    status: str
    total: int
    success: int
    failed: int
    error_msg: str | None
    duration_ms: int | None
    created_at: str | None


def _to_news_out(n: News) -> NewsItemOut:
    return NewsItemOut(
        id=n.id or 0,
        title=n.title,
        summary=n.summary,
        content=n.content,
        category=n.category,
        source=n.source,
        original_url=n.original_url,
        published_at=n.published_at,
        views=n.views or 0,
        is_trending=bool(n.is_trending),
        created_at=n.created_at,
    )


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "cqunews-backend",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/news", response_model=NewsListResponse)
def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
    trending_only: bool = False,
    ids: List[int] | None = Query(None),
    today_only: bool = False,
) -> NewsListResponse:
    with Session(engine) as db:
        stmt = select(News).where(News.audit_status == 1)
        if ids:
            stmt = stmt.where(News.id.in_(ids))  # type: ignore[attr-defined]
        if category:
            stmt = stmt.where(News.category == category)
        if source:
            stmt = stmt.where(col(News.source).like(f"%{source}%"))
        if trending_only:
            stmt = stmt.where(News.is_trending == 1)
        if keyword:
            like = f"%{keyword}%"
            stmt = stmt.where(
                (col(News.title).like(like)) | (col(News.summary).like(like))
            )
        if today_only:
            today_str = datetime.now().strftime("%Y-%m-%d")
            stmt = stmt.where(col(News.published_at).like(f"{today_str}%"))
        all_items = db.exec(stmt.order_by(News.id.desc())).all()
        
        filtered_items = [
            n for n in all_items 
            if not contains_garbled_text(n.title or "") 
            and not contains_garbled_text(n.summary or "")
        ]
        
        total = len(filtered_items)
        offset = (page - 1) * page_size
        paginated_items = filtered_items[offset:offset + page_size]
        
        return NewsListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[_to_news_out(n) for n in paginated_items],
        )


@router.get("/news/{news_id}", response_model=NewsItemOut)
def get_news(news_id: int, request: Request) -> NewsItemOut:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        
        current_user = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            try:
                from .auth import decode_token
                token = authorization[7:]
                payload = decode_token(token)
                if payload.get("type") == "access":
                    user_id = int(payload["sub"])
                    current_user = db.get(User, user_id)
            except Exception:
                pass
        
        news.views = (news.views or 0) + 1
        
        if current_user:
            import json
            extra_data = json.dumps({
                "category": news.category or "综合",
                "title": news.title[:50],
            })
            db.add(UserBehavior(
                user_id=current_user.id,
                action_type="view",
                target_id=news_id,
                extra_data=extra_data,
            ))
        
        db.commit()
        return _to_news_out(news)


@router.post("/news/{news_id}/view")
def increment_news_views(news_id: int, request: Request) -> dict[str, Any]:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        
        current_user = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            try:
                from .auth import decode_token
                token = authorization[7:]
                payload = decode_token(token)
                if payload.get("type") == "access":
                    user_id = int(payload["sub"])
                    current_user = db.get(User, user_id)
            except Exception:
                pass
        
        news.views = (news.views or 0) + 1
        
        if current_user:
            import json
            extra_data = json.dumps({
                "category": news.category or "综合",
                "title": news.title[:50],
            })
            db.add(UserBehavior(
                user_id=current_user.id,
                action_type="view",
                target_id=news_id,
                extra_data=extra_data,
            ))
        
        db.commit()
        return {"success": True, "views": news.views}


@router.post("/news/{news_id}/summary")
async def generate_news_summary(news_id: int, request: Request) -> dict[str, Any]:
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            raise HTTPException(status_code=404, detail="News not found")
        if not news.content:
            raise HTTPException(status_code=400, detail="新闻内容为空")

        current_user = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            try:
                from .auth import decode_token
                token = authorization[7:]
                payload = decode_token(token)
                if payload.get("type") == "access":
                    user_id = int(payload["sub"])
                    current_user = db.get(User, user_id)
            except Exception:
                pass

        from .ai_proxy import MODEL_CONFIGS
        config = MODEL_CONFIGS.get("DeepSeek")
        if not config:
            raise HTTPException(status_code=400, detail="不支持的模型")

        target_url = config["url"]
        target_api_key = config["default_key"]
        target_model = config["model_name"]

        if not target_api_key:
            raise HTTPException(status_code=400, detail="请在设置中心配置API密钥")

        try:
            import httpx
            import json
            async with httpx.AsyncClient(timeout=300.0) as client:
                system_prompt = "你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份中文的标准摘要。"
                user_prompt = f"""请对以下新闻内容进行标准摘要：

{news.content}

要求：
1. 准确概括新闻的核心内容
2. 保持客观中立的立场
3. 语言简洁明了
4. 使用中文"""

                payload = {
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500,
                }

                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {target_api_key}",
                }

                response = await client.post(target_url, json=payload, headers=headers)

                if not response.is_success:
                    logger.warning("AI API request failed: %s %s", response.status_code, response.text)
                    raise HTTPException(status_code=response.status_code, detail=f"API调用失败: {response.text[:200]}")

                result = response.json()
                summary = result["choices"][0]["message"]["content"]

                news.summary = summary
                db.commit()

                from .models import AuditLog, UserBehavior
                ip_address = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                            request.client.host if request.client else None
                
                db.add(AuditLog(
                    user_id=current_user.id if current_user else None,
                    action="generate_summary",
                    target=f"news:{news_id}",
                    detail=f"标题: {news.title[:50]}... 摘要: {summary[:100]}...",
                    ip_address=ip_address,
                ))

                if current_user:
                    extra_data = json.dumps({
                        "category": news.category or "综合",
                        "language": "中文",
                        "summary_style": "标准摘要",
                        "model": target_model,
                    })
                    db.add(UserBehavior(
                        user_id=current_user.id,
                        action_type="generate",
                        target_id=news_id,
                        extra_data=extra_data,
                    ))
                
                db.commit()

                return {"success": True, "summary": summary}

        except httpx.RequestError as e:
            logger.error("AI API request error: %s", e)
            raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")
        except Exception as e:
            logger.error("Generate summary error: %s", e)
            raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@router.get("/categories")
def list_categories() -> dict[str, list[str]]:
    with Session(engine) as db:
        rows = db.exec(select(News.category).distinct()).all()
        cats = [r for r in rows if r]
        return {"categories": sorted(cats)}


@router.get("/sources", response_model=list[CrawlSourceOut])
def list_sources() -> list[CrawlSourceOut]:
    with Session(engine) as db:
        rows = db.exec(select(CrawlSource).order_by(CrawlSource.id.asc())).all()  # type: ignore[attr-defined]
        return [CrawlSourceOut(**r.model_dump()) for r in rows]


@router.post("/crawl/run", response_model=CrawlRunResponse)
def run_crawl_now(req: CrawlRunRequest, admin: AdminUser = Depends(get_admin_user)) -> CrawlRunResponse:
    try:
        if req.source_ids:
            from .crawler import run_crawl_by_source_ids

            run_crawl_by_source_ids(req.source_ids)
        else:
            trigger_crawl_now()
        return CrawlRunResponse(
            triggered=True,
            message="Crawl finished (synchronous).",
            started_at=datetime.now().isoformat(),
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Crawl trigger failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crawl/logs", response_model=list[CrawlLogOut])
def list_crawl_logs(limit: int = Query(20, ge=1, le=200)) -> list[CrawlLogOut]:
    with Session(engine) as db:
        rows = db.exec(
            select(CrawlLog).order_by(CrawlLog.id.desc()).limit(limit)  # type: ignore[attr-defined]
        ).all()
        return [CrawlLogOut(**r.model_dump()) for r in rows]




class ParseUrlRequest(BaseModel):
    url: str = Field(..., description="要解析的网页URL")


class ParseUrlResponse(BaseModel):
    success: bool
    title: str = ""
    content: str = ""
    summary: str = ""
    error: str = ""


@router.post("/parse-url", response_model=ParseUrlResponse)
def parse_url(req: ParseUrlRequest) -> ParseUrlResponse:
    try:
        from .crawler import _session, fetch_article
        
        session = _session()
        result = fetch_article(session, req.url, "url_parser", "")
        
        if result:
            return ParseUrlResponse(
                success=True,
                title=result.title,
                content=result.content,
                summary=result.summary,
            )
        else:
            return ParseUrlResponse(
                success=False,
                error="无法解析该网页内容",
            )
    except Exception as e:
        logger.error("URL parse failed: %s", e)
        return ParseUrlResponse(
            success=False,
            error=str(e),
        )

@router.get("/stats")
def stats() -> dict[str, Any]:
    with Session(engine) as db:
        total = len(db.exec(select(News)).all())
        trending = len(db.exec(select(News).where(News.is_trending == 1)).all())
        source_count = len(db.exec(select(CrawlSource)).all())
        log_count = len(db.exec(select(CrawlLog)).all())
        latest = db.exec(
            select(News).order_by(News.id.desc()).limit(1)  # type: ignore[attr-defined]
        ).first()
        return {
            "total_news": total,
            "trending_news": trending,
            "sources": source_count,
            "crawl_runs": log_count,
            "latest_news": _to_news_out(latest) if latest else None,
        }


from .models import EmailVerificationCode, UserFavoriteNews, User


class SendCodeRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")


class VerifyCodeRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")
    code: str = Field(..., description="验证码")


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")
    code: str = Field(..., description="验证码")
    new_password: str = Field(..., description="新密码")


import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
from .config import settings


def send_email(to_email: str, subject: str, body: str) -> bool:
    try:
        if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.warning("SMTP not configured")
            return False
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


def generate_code() -> str:
    return ''.join(random.choices('0123456789', k=6))


@router.post("/auth/send-verification-code")
def send_verification_code(req: SendCodeRequest) -> dict[str, Any]:
    with Session(engine) as db:
        user = db.exec(select(User).where(User.email == req.email)).first()
        if not user:
            return {"code": 1, "message": "邮箱未注册"}

        existing_code = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        if existing_code:
            db.delete(existing_code)

        code = generate_code()
        expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        verification_code = EmailVerificationCode(
            user_id=user.id,
            email=req.email,
            code=code,
            expires_at=expires_at,
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(verification_code)
        db.commit()

        subject = "CQUNEWS - 验证码"
        body = f"您的验证码是：{code}\n\n该验证码有效期为5分钟，请尽快使用。"
        
        email_sent = send_email(req.email, subject, body)
        return {"code": 0, "message": "验证码已发送" if email_sent else "验证码已生成，请检查邮件配置"}


@router.post("/auth/verify-code")
def verify_code(req: VerifyCodeRequest) -> dict[str, Any]:
    with Session(engine) as db:
        code_record = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        
        if not code_record:
            return {"code": 1, "message": "验证码不存在"}
        
        if datetime.utcnow().isoformat() > code_record.expires_at:
            db.delete(code_record)
            db.commit()
            return {"code": 1, "message": "验证码已过期"}
        
        if code_record.code != req.code:
            return {"code": 1, "message": "验证码错误"}
        
        db.delete(code_record)
        db.commit()
        return {"code": 0, "message": "验证成功"}


@router.post("/auth/reset-password-with-code")
def reset_password_with_code(req: ResetPasswordRequest) -> dict[str, Any]:
    with Session(engine) as db:
        code_record = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        if not code_record:
            return {"code": 1, "message": "验证码不存在"}
        
        if datetime.fromisoformat(code_record.expires_at) < datetime.utcnow():
            return {"code": 1, "message": "验证码已过期"}
        
        if code_record.code != req.code:
            return {"code": 1, "message": "验证码错误"}
        
        user = db.exec(select(User).where(User.email == req.email)).first()
        if not user:
            return {"code": 1, "message": "用户不存在"}
        
        from .auth import hash_password
        user.password_hash = hash_password(req.new_password)
        db.delete(code_record)
        db.commit()
        return {"code": 0, "message": "密码重置成功"}


@router.get("/auth/verify-token")
def verify_token(request: Request) -> dict[str, Any]:
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return {"code": 1, "message": "未登录"}
    
    from .auth import decode_token
    try:
        payload = decode_token(token[7:])
        user_id = int(payload["sub"])
    except:
        return {"code": 1, "message": "无效令牌"}
    
    with Session(engine) as db:
        user = db.get(User, user_id)
        if not user:
            return {"code": 1, "message": "用户不存在"}
        
        return {"code": 0, "data": {"account_status": user.account_status}}


@router.post("/news/{news_id}/favorite")
def toggle_favorite(news_id: int, request: Request) -> dict[str, Any]:
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return {"code": 1, "message": "未登录"}
    
    from .auth import decode_token
    try:
        payload = decode_token(token[7:])
        user_id = int(payload["sub"])
    except:
        return {"code": 1, "message": "无效令牌"}
    
    with Session(engine) as db:
        news = db.get(News, news_id)
        if not news:
            return {"code": 1, "message": "新闻不存在"}
        
        favorite = db.exec(
            select(UserFavoriteNews).where(
                UserFavoriteNews.user_id == user_id,
                UserFavoriteNews.news_id == news_id
            )
        ).first()
        
        if favorite:
            db.delete(favorite)
            db.commit()
            return {"code": 0, "message": "已取消收藏", "is_favorite": False}
        else:
            new_favorite = UserFavoriteNews(
                user_id=user_id,
                news_id=news_id,
                created_at=datetime.utcnow().isoformat(),
            )
            db.add(new_favorite)
            db.commit()
            return {"code": 0, "message": "已收藏", "is_favorite": True}


@router.get("/news/favorite/list")
def get_favorites(request: Request) -> dict[str, Any]:
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return {"code": 1, "message": "未登录"}
    
    from .auth import decode_token
    try:
        payload = decode_token(token[7:])
        user_id = int(payload["sub"])
    except:
        return {"code": 1, "message": "无效令牌"}
    
    with Session(engine) as db:
        favorites = db.exec(
            select(UserFavoriteNews).where(UserFavoriteNews.user_id == user_id)
        ).all()
        news_ids = [f.news_id for f in favorites]
        
        if not news_ids:
            return {"code": 0, "data": []}
        
        news_items = db.exec(
            select(News).where(News.id.in_(news_ids))
        ).all()
        
        return {
            "code": 0,
            "data": [_to_news_out(n) for n in news_items]
        }


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="用户邮箱")


class VerificationCodeRequest(BaseModel):
    email: str = Field(..., description="用户邮箱")
    code: str = Field(..., description="验证码")


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., description="用户邮箱")
    code: str = Field(..., description="验证码")
    new_password: str = Field(..., description="新密码")


class RecordBehaviorRequest(BaseModel):
    action_type: str = Field(..., description="行为类型: view, redirect, generate")
    target_id: int = Field(..., description="目标新闻ID")
    category: str = Field(default="综合", description="新闻分类")
    title: str = Field(default="", description="新闻标题")


@router.post("/behavior/record")
def record_behavior(req: RecordBehaviorRequest, request: Request) -> dict[str, Any]:
    with Session(engine) as db:
        current_user = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            try:
                from .auth import decode_token
                token = authorization[7:]
                payload = decode_token(token)
                if payload.get("type") == "access":
                    user_id = int(payload["sub"])
                    current_user = db.get(User, user_id)
            except Exception:
                pass
        
        import json
        extra_data = json.dumps({
            "category": req.category or "综合",
            "title": req.title[:50],
        })
        
        if current_user:
            db.add(UserBehavior(
                user_id=current_user.id,
                action_type=req.action_type,
                target_id=req.target_id,
                extra_data=extra_data,
            ))
            db.commit()
            return {"success": True, "user_id": current_user.id}
        else:
            return {"success": True, "user_id": None, "message": "匿名用户行为已记录"}


@router.post("/forgot-password/send-code")
async def send_verification_code(req: ForgotPasswordRequest, request: Request):
    with Session(engine) as db:
        user = db.exec(select(User).where(User.email == req.email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="该邮箱未注册")

        code = generate_code()
        expires_at = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        
        existing_code = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        if existing_code:
            db.delete(existing_code)

        verification_code = EmailVerificationCode(
            user_id=user.id,
            email=req.email,
            code=code,
            expires_at=expires_at,
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(verification_code)
        db.commit()

        if settings.SEND_EMAIL_ENABLED and settings.SMTP_HOST:
            try:
                import smtplib
                from email.mime.text import MIMEText
                from email.utils import formataddr

                message = MIMEText(f"您的验证码是：{code}，有效期5分钟。", "plain", "utf-8")
                message["From"] = formataddr(("CQUNEWS", settings.SMTP_SENDER))
                message["To"] = req.email
                message["Subject"] = "密码重置验证码"

                if settings.SMTP_USE_SSL:
                    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                        server.sendmail(settings.SMTP_SENDER, req.email, message.as_string())
                else:
                    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                        if settings.SMTP_USE_TLS:
                            server.starttls()
                        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                        server.sendmail(settings.SMTP_SENDER, req.email, message.as_string())
                return {"success": True, "message": "验证码已发送到您的邮箱"}
            except Exception as e:
                logger.error(f"Failed to send email: {e}")
                return {"success": True, "message": "验证码已生成", "code": code}
        else:
            logger.info(f"Verification code for {req.email}: {code}")
            return {"success": True, "message": "验证码已生成（开发模式）", "code": code}


@router.post("/forgot-password/verify-code")
def verify_code(req: VerificationCodeRequest):
    with Session(engine) as db:
        code_record = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        
        if not code_record:
            raise HTTPException(status_code=400, detail="验证码不存在")
        
        if datetime.fromisoformat(code_record.expires_at) < datetime.utcnow():
            db.delete(code_record)
            db.commit()
            raise HTTPException(status_code=400, detail="验证码已过期")
        
        if code_record.code != req.code:
            raise HTTPException(status_code=400, detail="验证码错误")
        
        return {"success": True, "message": "验证码验证成功"}


@router.post("/forgot-password/reset")
def reset_password_endpoint(req: ResetPasswordRequest):
    with Session(engine) as db:
        code_record = db.exec(
            select(EmailVerificationCode).where(EmailVerificationCode.email == req.email)
        ).first()
        if not code_record:
            raise HTTPException(status_code=400, detail="验证码不存在")
        
        if datetime.fromisoformat(code_record.expires_at) < datetime.utcnow():
            raise HTTPException(status_code=400, detail="验证码已过期")
        
        if code_record.code != req.code:
            raise HTTPException(status_code=400, detail="验证码错误")
        
        user = db.exec(select(User).where(User.email == req.email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        from .auth import hash_password
        user.password_hash = hash_password(req.new_password)
        db.delete(code_record)
        db.commit()
        return {"success": True, "message": "密码重置成功"}
