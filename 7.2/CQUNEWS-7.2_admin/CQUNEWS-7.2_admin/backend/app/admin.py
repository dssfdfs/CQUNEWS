from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from .auth import create_access_token, hash_password, verify_password
from .config import settings
from .database import get_session
from .logger import logger
from .models import AdminUser, AuditLog, Feedback, News, SystemConfig, User, UserBehavior

router = APIRouter(prefix="/api/admin", tags=["admin"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_superuser: bool
    created_at: str


def get_admin_user(
    request: Request,
    db: Session = Depends(get_session),
) -> AdminUser:
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少访问令牌")
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的令牌格式")
    token = parts[1]

    try:
        import jwt

        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")
        admin_id = int(payload["sub"])
        admin = db.get(AdminUser, admin_id)
        if not admin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理员不存在")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌已过期")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的令牌")


@router.post("/auth/login")
def admin_login(request: LoginRequest, db: Session = Depends(get_session)):
    admin = db.exec(select(AdminUser).where(AdminUser.username == request.username)).first()
    if not admin or not verify_password(request.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    access_token = create_access_token(admin.id)
    return LoginResponse(
        access_token=access_token,
        user={
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "is_superuser": admin.is_superuser,
        },
    )


@router.get("/auth/me")
def admin_me(admin: AdminUser = Depends(get_admin_user)):
    return AdminUserResponse(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        is_superuser=admin.is_superuser,
        created_at=admin.created_at,
    )


@router.get("/analytics/user-behavior")
def get_user_behavior(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()[:10]
    if not end_date:
        end_date = datetime.utcnow().isoformat()[:10]

    query = select(UserBehavior).where(
        UserBehavior.timestamp >= start_date,
        UserBehavior.timestamp <= end_date + "T23:59:59",
    )
    behaviors = db.exec(query).all()

    dau_data: dict[str, set] = {}
    action_counts: dict[str, int] = {}
    generate_durations: list[float] = []

    for behavior in behaviors:
        date_key = behavior.timestamp[:10]
        if date_key not in dau_data:
            dau_data[date_key] = set()
        dau_data[date_key].add(behavior.user_id)

        action_counts[behavior.action_type] = action_counts.get(behavior.action_type, 0) + 1

        if behavior.action_type == "generate" and behavior.extra_data:
            try:
                meta = json.loads(behavior.extra_data)
                if "duration_ms" in meta:
                    generate_durations.append(meta["duration_ms"] / 1000)
            except (json.JSONDecodeError, ValueError):
                pass

    days_ordered = sorted(dau_data.keys())
    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

    dau_chart = []
    for date_str in days_ordered:
        dt = datetime.fromisoformat(date_str)
        day_name = day_names[dt.weekday()]
        dau_chart.append({"name": day_name, "value": len(dau_data[date_str])})

    action_chart = []
    action_labels = {
        "generate": "生成摘要",
        "view": "查看新闻",
        "feedback": "提交反馈",
    }
    for action_type, count in action_counts.items():
        action_chart.append({"name": action_labels.get(action_type, action_type), "value": count})

    avg_duration = sum(generate_durations) / len(generate_durations) if generate_durations else 0

    duration_distribution = {
        "0-5s": 0,
        "5-10s": 0,
        "10-15s": 0,
        "15-30s": 0,
        ">30s": 0,
    }
    for duration in generate_durations:
        if duration < 5:
            duration_distribution["0-5s"] += 1
        elif duration < 10:
            duration_distribution["5-10s"] += 1
        elif duration < 15:
            duration_distribution["10-15s"] += 1
        elif duration < 30:
            duration_distribution["15-30s"] += 1
        else:
            duration_distribution[">30s"] += 1

    duration_chart = [{"name": k, "value": v} for k, v in duration_distribution.items()]

    return {
        "dau": dau_chart,
        "action_distribution": action_chart,
        "avg_duration": round(avg_duration, 2),
        "duration_distribution": duration_chart,
        "total_records": len(behaviors),
    }


@router.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_session), admin: AdminUser = Depends(get_admin_user)):
    today = datetime.utcnow().isoformat()[:10]

    total_users = db.exec(select(User)).all()
    total_users_count = len(total_users)

    today_behaviors = db.exec(
        select(UserBehavior).where(UserBehavior.timestamp >= today)
    ).all()
    today_active_users = len(set(b.user_id for b in today_behaviors))
    today_generate_count = sum(1 for b in today_behaviors if b.action_type == "generate")

    pending_feedback = db.exec(select(Feedback).where(Feedback.status == "pending")).all()
    pending_feedback_count = len(pending_feedback)

    return {
        "total_users": total_users_count,
        "today_active_users": today_active_users,
        "today_generate_count": today_generate_count,
        "pending_feedback": pending_feedback_count,
    }


@router.get("/users")
def get_users(
    search: Optional[str] = None,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    query = select(User)
    if search:
        query = query.where(
            (User.username.contains(search)) | (User.email.contains(search))
        )
    users = db.exec(query).all()

    result = []
    for user in users:
        behaviors = db.exec(
            select(UserBehavior).where(UserBehavior.user_id == user.id).order_by(UserBehavior.timestamp.desc())
        ).all()
        total_actions = len(behaviors)
        last_active = behaviors[0].timestamp if behaviors else None

        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "status": user.status,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "total_actions": total_actions,
            "last_active": last_active,
        })

    return {"users": result}


@router.get("/users/{user_id}/history")
def get_user_history(
    user_id: int,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    behaviors = db.exec(
        select(UserBehavior).where(UserBehavior.user_id == user_id).order_by(UserBehavior.timestamp.desc())
    ).all()

    action_labels = {
        "generate": "生成摘要",
        "view": "查看新闻",
        "feedback": "提交反馈",
    }

    result = []
    for behavior in behaviors:
        meta_data = {}
        if behavior.extra_data:
            try:
                meta_data = json.loads(behavior.extra_data)
            except json.JSONDecodeError:
                pass

        result.append({
            "id": behavior.id,
            "action_type": behavior.action_type,
            "action_label": action_labels.get(behavior.action_type, behavior.action_type),
            "target_id": behavior.target_id,
            "metadata": meta_data,
            "timestamp": behavior.timestamp,
        })

    return {"history": result}


@router.get("/config/default-api-key")
def get_default_api_key(db: Session = Depends(get_session), admin: AdminUser = Depends(get_admin_user)):
    config = db.exec(select(SystemConfig).where(SystemConfig.key == "default_api_key")).first()
    return {"api_key": config.value if config else ""}


class ApiKeyUpdateRequest(BaseModel):
    api_key: str


@router.put("/config/default-api-key")
def update_default_api_key(
    request: ApiKeyUpdateRequest,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    config = db.exec(select(SystemConfig).where(SystemConfig.key == "default_api_key")).first()
    if config:
        config.value = request.api_key
        config.updated_at = datetime.utcnow().isoformat()
    else:
        config = SystemConfig(
            key="default_api_key",
            value=request.api_key,
            description="默认API密钥",
        )
        db.add(config)
    db.commit()
    db.refresh(config)
    return {"api_key": config.value}


@router.get("/feedback")
def get_feedback(
    status: Optional[str] = None,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    query = select(Feedback)
    if status:
        query = query.where(Feedback.status == status)
    feedbacks = db.exec(query.order_by(Feedback.created_at.desc())).all()

    result = []
    for feedback in feedbacks:
        user = db.get(User, feedback.user_id)
        result.append({
            "id": feedback.id,
            "user_id": feedback.user_id,
            "username": user.username if user else "",
            "email": user.email if user else "",
            "content": feedback.content,
            "contact_info": feedback.contact_info,
            "status": feedback.status,
            "created_at": feedback.created_at,
        })

    return {"feedbacks": result}


@router.put("/feedback/{feedback_id}/resolve")
def resolve_feedback(
    feedback_id: int,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    feedback = db.get(Feedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="反馈不存在")

    feedback.status = "resolved"
    db.commit()
    db.refresh(feedback)

    user = db.get(User, feedback.user_id)
    return {
        "id": feedback.id,
        "user_id": feedback.user_id,
        "username": user.username if user else "",
        "content": feedback.content,
        "status": feedback.status,
        "created_at": feedback.created_at,
    }


@router.get("/export/users")
def export_users(db: Session = Depends(get_session), admin: AdminUser = Depends(get_admin_user)):
    import os

    db_path = settings.DB_PATH
    if not os.path.exists(db_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据库文件不存在")

    filename = f"cqunews_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.db"
    return FileResponse(
        db_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.post("/analyze/url")
def analyze_url(
    url: str,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    from .crawler import Crawler

    crawler = Crawler()
    try:
        article = crawler.fetch_article(url)
        if not article or not article.get("content"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无法获取文章内容")

        from .ai_proxy import generate_summary as proxy_generate_summary

        summary_result = proxy_generate_summary(article["content"])
        return {
            "title": article.get("title", ""),
            "summary": summary_result.get("summary", ""),
            "url": url,
        }
    except Exception as e:
        logger.exception(f"URL analysis failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"分析失败: {str(e)}")


class UserBehaviorRequest(BaseModel):
    action_type: str
    target_id: Optional[int] = None
    extra_data: Optional[str] = None


class FeedbackRequest(BaseModel):
    content: str
    contact_info: Optional[str] = None


@router.post("/user/feedback")
def submit_feedback(
    request: Request,
    feedback_req: FeedbackRequest,
    db: Session = Depends(get_session),
):
    from .auth import get_current_user

    try:
        authorization = request.headers.get("Authorization")
        user = get_current_user(request, authorization, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户未登录")

        feedback = Feedback(
            user_id=user.id,
            content=feedback_req.content,
            contact_info=feedback_req.contact_info,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

        return {"id": feedback.id, "status": feedback.status, "created_at": feedback.created_at}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Submit feedback failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="提交反馈失败")


@router.post("/user/behavior")
def record_user_behavior(
    request: Request,
    behavior_req: UserBehaviorRequest,
    db: Session = Depends(get_session),
):
    from .auth import get_current_user

    try:
        authorization = request.headers.get("Authorization")
        user = get_current_user(request, authorization, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户未登录")

        behavior = UserBehavior(
            user_id=user.id,
            action_type=behavior_req.action_type,
            target_id=behavior_req.target_id,
            extra_data=behavior_req.extra_data,
        )
        db.add(behavior)
        db.commit()
        db.refresh(behavior)

        return {"id": behavior.id, "timestamp": behavior.timestamp}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Record user behavior failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="记录行为失败")


@router.get("/user/history")
def get_user_history(
    request: Request,
    db: Session = Depends(get_session),
):
    from .auth import get_current_user

    try:
        user = get_current_user(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户未登录")

        behaviors = db.exec(
            select(UserBehavior)
            .where(UserBehavior.user_id == user.id)
            .order_by(UserBehavior.timestamp.desc())
        ).all()

        history = []
        for behavior in behaviors:
            history.append({
                "id": behavior.id,
                "action_type": behavior.action_type,
                "target_id": behavior.target_id,
                "metadata": behavior.extra_data,
                "timestamp": behavior.timestamp,
            })

        return {"history": history}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Get user history failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="获取历史记录失败")


@router.get("/analytics/heatmap")
def get_user_active_heatmap(
    days: int = 7,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    from datetime import timedelta
    
    days_ago = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    behaviors = db.exec(
        select(UserBehavior).where(UserBehavior.timestamp >= days_ago)
    ).all()
    
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    hours = list(range(24))
    
    heatmap = []
    for weekday in weekdays:
        for hour in hours:
            heatmap.append({
                "weekday": weekday,
                "hour": hour,
                "value": 0,
            })
    
    for behavior in behaviors:
        try:
            ts = datetime.fromisoformat(behavior.timestamp.replace("Z", "+00:00"))
            weekday_idx = ts.weekday()
            hour = ts.hour
            idx = weekday_idx * 24 + hour
            if 0 <= idx < len(heatmap):
                heatmap[idx]["value"] += 1
        except:
            pass
    
    return {"heatmap": heatmap, "weekdays": weekdays, "hours": hours}


@router.get("/analytics/word-cloud")
def get_user_profile_word_cloud(
    days: int = 7,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    from datetime import timedelta
    import re
    
    days_ago = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    behaviors = db.exec(
        select(UserBehavior).where(UserBehavior.timestamp >= days_ago)
    ).all()
    
    news_items = db.exec(select(News)).all()
    
    stopwords = {
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到",
        "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "新闻", "摘要", "内容", "报道",
        "称", "表示", "认为", "指出", "消息", "来源", "记者", "通过", "可以", "已经", "因为", "但是", "如果",
        "虽然", "这些", "这样", "那些", "什么", "怎么", "为什么", "多少", "一些", "有些", "任何", "每", "各",
        "某", "另", "其他", "以及", "等等", "的话", "而已", "罢了", "也好", "也罢", "其实", "确实", "实在",
        "真的", "简直", "几乎", "大约", "大概", "左右", "上下", "前后", "以来", "以前", "以后", "目前",
        "当前", "现在", "今天", "昨天", "明天", "最近", "刚才", "马上", "立刻", "突然", "忽然", "渐渐",
        "慢慢", "一直", "始终", "仍然", "还是", "曾经", "永远", "临时", "暂时", "首先", "其次", "然后",
        "接着", "最后", "终于", "到底", "毕竟", "究竟", "居然", "竟然", "偏偏", "反倒", "反正", "索性",
        "宁可", "不如", "免得", "以免", "省得", "进行", "作为", "由于", "对于", "关于", "根据", "按照",
        "通过", "经过", "经由", "得以", "得以", "能够", "可能", "应该", "必须", "需要", "可以", "应该",
        "必须", "需要", "以便", "以免", "省得", "不然", "否则", "要不", "要不", "要么", "或者", "还是",
        "以及", "及其", "等等", "之类", "等等", "等等", "就是", "就是说", "也就是说", "即", "比如", "例如",
        "包括", "包含", "总之", "总而言之", "总的来说", "综上所述", "由此可见", "由此可知", "因此", "因而",
        "从而", "于是", "所以", "结果", "导致", "引起", "造成", "使得", "致使", "以致", "以便", "以免",
        "省得", "否则", "不然", "要不", "要是", "如果", "假如", "要是", "倘若", "万一", "一旦", "只要",
        "只有", "除非", "不论", "无论", "不管", "尽管", "虽然", "即使", "哪怕", "就算", "虽然", "尽管",
        "固然", "但是", "可是", "然而", "不过", "只是", "反而", "倒是", "却", "偏偏", "居然", "竟然",
        "果然", "果然", "确实", "的确", "实在", "真的", "简直", "太", "非常", "十分", "特别", "尤其",
        "更加", "更为", "最为", "最", "极", "极其", "极端", "彻底", "完全", "全部", "所有", "一切",
        "任何", "每", "各", "某", "另", "其他", "其余", "别的", "另外", "额外", "附加", "附带", "随同",
        "伴随", "一起", "一同", "共同", "互相", "彼此", "相互", "各自", "分别", "分头", "陆续", "相继",
        "依次", "逐个", "逐一", "逐", "逐个", "逐一", "分别", "分头", "各自", "互相", "彼此", "相互",
        "一起", "一同", "共同", "同时", "同步", "一并", "一并", "一并", "一并", "一并", "一并",
        "AI", "智能", "自动", "生成", "摘要", "标题", "文章", "网页", "链接", "网站", "页面", "内容",
        "查看", "浏览", "阅读", "点击", "访问", "跳转", "打开", "关闭", "保存", "分享", "转发", "评论",
        "点赞", "收藏", "关注", "订阅", "通知", "提醒", "消息", "反馈", "建议", "意见", "问题", "错误",
        "bug", "bug", "错误", "问题", "故障", "异常", "失败", "成功", "完成", "结束", "开始", "启动",
        "停止", "暂停", "继续", "恢复", "返回", "退出", "登录", "注册", "账号", "密码", "验证码",
        "搜索", "查询", "筛选", "排序", "分页", "翻页", "上一页", "下一页", "首页", "末页", "详情",
        "列表", "表格", "图表", "统计", "数据", "分析", "报告", "记录", "日志", "历史", "时间", "日期",
        "今天", "昨天", "明天", "本周", "上周", "下周", "本月", "上月", "下月", "今年", "去年", "明年",
    }
    
    category_keywords = {
        "科技": ["科技", "人工智能", "互联网", "软件", "大数据", "云计算", "芯片", "机器人", "5G", "手机", "电脑", "技术", "系统", "网络", "数据", "算法", "编程", "开发", "应用", "平台", "服务", "产品", "设备", "硬件", "软件", "程序", "代码", "框架", "工具", "引擎", "协议", "标准", "规范", "接口", "架构", "设计", "实现", "测试", "部署", "运维", "安全", "加密", "解密", "黑客", "攻击", "防御", "漏洞", "补丁", "更新", "升级", "版本", "发布", "上线", "下线", "维护", "修复", "优化", "性能", "效率", "速度", "响应", "延迟", "带宽", "存储", "内存", "CPU", "GPU", "服务器", "客户端", "终端", "浏览器", "操作系统", "数据库", "缓存", "分布式", "集群", "容器", "虚拟化", "云", "边缘", "物联网", "传感器", "摄像头", "语音", "图像", "视频", "音频", "识别", "检测", "跟踪", "监控", "管理", "控制", "自动化", "智能化", "数字化", "信息化", "网络化", "移动化", "社交", "电商", "金融", "医疗", "教育", "娱乐", "游戏", "媒体", "内容", "直播", "短视频", "社交", "社区", "论坛", "博客", "微博", "微信", "抖音", "快手", "B站", "知乎", "小红书", "豆瓣", "美团", "饿了么", "滴滴", "高德", "百度", "阿里", "腾讯", "字节", "京东", "拼多多", "网易", "新浪", "搜狐", "小米", "华为", "OPPO", "vivo", "荣耀", "联想", "华硕", "戴尔", "惠普", "苹果", "三星", "索尼", "微软", "谷歌", "亚马逊", "Meta", "特斯拉", "SpaceX"],
        "财经": ["财经", "股票", "投资", "市场", "经济", "金融", "企业", "财报", "基金", "银行", "公司", "价格", "指数", "收益", "利润", "资产", "货币", "汇率", "贸易", "出口", "进口", "GDP", "CPI", "PPI", "利率", "汇率", "债券", "期货", "期权", "外汇", "黄金", "白银", "原油", "大宗商品", "房地产", "房价", "租金", "物业", "土地", "政策", "调控", "限购", "限贷", "降息", "加息", "降准", "准备金", "货币政策", "财政政策", "税收", "减税", "免税", "补贴", "扶持", "创业", "创新", "科技", "研发", "专利", "知识产权", "品牌", "营销", "销售", "渠道", "零售", "批发", "供应链", "物流", "仓储", "配送", "电商", "直播", "带货", "跨境", "出海", "全球化", "国际化", "贸易战", "关税", "制裁", "反制", "协议", "谈判", "合作", "并购", "收购", "重组", "上市", "IPO", "退市", "破产", "清算", "重组", "债务", "违约", "风险", "危机", "泡沫", "崩盘", "暴跌", "暴涨", "牛市", "熊市", "震荡", "反弹", "回调", "盘整", "趋势", "技术", "分析", "基本面", "估值", "市盈率", "市净率", "ROE", "现金流", "净利润", "营收", "成本", "费用", "毛利率", "净利率", "负债", "资产", "股东", "股权", "分红", "配股", "增发", "可转债", "优先股", "普通股", "限售股", "解禁", "减持", "增持", "回购", "注销", "股权激励", "员工持股", "创投", "风投", "私募", "公募", "券商", "投行", "保险", "信托", "基金", "理财", "存款", "贷款", "信用卡", "消费", "分期", "逾期", "催收", "征信", "坏账", "不良", "拨备", "核销", "处置", "资产管理", "财富管理", "私人银行", "家族办公室", "金融科技", "数字金融", "移动支付", "数字货币", "区块链", "DeFi", "NFT", "元宇宙", "Web3"],
        "体育": ["体育", "足球", "篮球", "比赛", "奥运", "运动员", "赛事", "健身", "跑步", "网球", "冠军", "联赛", "教练", "球队", "比分", "训练", "俱乐部", "国家队", "世界杯", "欧洲杯", "亚洲杯", "美洲杯", "非洲杯", "欧冠", "欧联", "英超", "西甲", "德甲", "意甲", "法甲", "中超", "CBA", "NBA", "NFL", "MLB", "NHL", "F1", "网球", "高尔夫", "游泳", "田径", "体操", "跳水", "举重", "拳击", "柔道", "跆拳道", "羽毛球", "乒乓球", "排球", "沙滩排球", "水球", "曲棍球", "橄榄球", "手球", "棒球", "垒球", "冰球", "滑雪", "滑冰", "冰壶", "雪橇", "冬季两项", "铁人三项", "马拉松", "竞走", "跳远", "跳高", "三级跳", "撑杆跳", "短跑", "中长跑", "跨栏", "接力", "铅球", "铁饼", "标枪", "链球", "射击", "射箭", "击剑", "马术", "赛艇", "皮划艇", "帆船", "帆板", "冲浪", "滑板", "攀岩", "蹦床", "艺术体操", "花样滑冰", "花样游泳", "速度滑冰", "短道速滑", "自由式滑雪", "高山滑雪", "越野滑雪", "跳台滑雪", "北欧两项", "单板滑雪", "冰球", "冰壶", "雪橇", "雪车", "冬季两项", "吉祥物", "奖牌", "金牌", "银牌", "铜牌", "纪录", "破纪录", "卫冕", "夺冠", "亚军", "季军", "黑马", "冷门", "爆冷", "逆转", "绝杀", "点球", "加时", "淘汰", "晋级", "决赛", "半决赛", "小组赛", "预选赛", "资格赛", "热身赛", "友谊赛", "巡回赛", "锦标赛", "公开赛", "大师赛", "超级杯", "冠军杯", "联赛杯", "足总杯", "国王杯", "意大利杯", "德国杯", "法国杯", "联盟杯", "优胜者杯", "洲际杯", "世俱杯", "联合会杯", "欧洲超级杯", "南美解放者杯", "亚冠", "亚俱杯", "亚洲杯", "亚运会", "全运会", "城运会", "青运会", "大运会", "军运会", "残疾人奥运会", "特奥会"],
        "娱乐": ["娱乐", "电影", "音乐", "明星", "综艺", "电视剧", "演唱会", "媒体", "娱乐圈", "演员", "歌手", "导演", "票房", "专辑", "粉丝", "红毯", "颁奖", "电影节", "音乐节", "综艺节", "电视剧节", "颁奖典礼", "红毯秀", "首映礼", "发布会", "见面会", "签售会", "演唱会", "音乐节", "livehouse", "剧场", "影院", "票房", "收视率", "播放量", "点击率", "热度", "话题", "热搜", "榜单", "排行榜", "冠军", "亚军", "季军", "人气", "流量", "粉丝", "饭圈", "应援", "打榜", "投票", "抽奖", "福利", "周边", "衍生品", "代言", "广告", "品牌", "时尚", "穿搭", "造型", "美妆", "护肤", "发型", "珠宝", "配饰", "奢侈品", "高定", "红毯", "杂志", "封面", "写真", "街拍", "私服", "机场", "路透", "绯闻", "恋情", "结婚", "离婚", "生子", "二胎", "三胎", "全家福", "纪念日", "生日", "派对", "聚会", "饭局", "综艺", "真人秀", "选秀", "竞技", "挑战", "旅行", "美食", "生活", "情感", "访谈", "脱口秀", "相声", "小品", "魔术", "杂技", "歌舞", "戏曲", "音乐剧", "话剧", "歌剧", "舞剧", "芭蕾", "现代舞", "街舞", "爵士舞", "拉丁舞", "民族舞", "广场舞", "电影", "动作片", "喜剧片", "爱情片", "科幻片", "恐怖片", "悬疑片", "战争片", "历史片", "纪录片", "动画片", "电视剧", "古装剧", "现代剧", "都市剧", "乡村剧", "偶像剧", "家庭剧", "伦理剧", "谍战剧", "军旅剧", "武侠剧", "仙侠剧", "奇幻剧", "穿越剧", "宫斗剧", "权谋剧", "商战剧", "职场剧", "校园剧", "青春剧", "偶像剧", "言情剧", "虐恋剧", "甜宠剧", "网剧", "网络大电影", "微短剧", "竖屏剧", "短剧", "长剧", "季播剧", "周播剧", "日播剧", "更新", "上线", "首播", "收官", "大结局", "剧透", "彩蛋", "花絮", "预告", "海报", "剧照", "片花", "主题曲", "插曲", "片尾曲", "OST", "原声", "配乐", "音效", "配音", "字幕", "翻译", "引进", "出口", "合拍", "独立电影", "艺术电影", "商业电影", "主旋律", "贺岁片", "暑期档", "国庆档", "春节档", "情人节档", "暑期档", "五一档", "端午档", "中秋档", "跨年档"],
        "时政": ["时政", "政策", "政府", "国际", "外交", "会议", "社会", "民生", "改革", "法律", "选举", "军事", "安全", "环保", "教育", "医疗", "经济", "金融", "贸易", "科技", "文化", "体育", "娱乐", "媒体", "网络", "信息", "数据", "隐私", "安全", "监管", "治理", "管理", "服务", "公共", "社会", "社区", "城市", "农村", "乡村", "发展", "建设", "规划", "计划", "方案", "措施", "办法", "条例", "法规", "法律", "宪法", "刑法", "民法", "行政法", "诉讼法", "仲裁", "调解", "判决", "裁定", "执行", "上诉", "抗诉", "再审", "申诉", "信访", "举报", "投诉", "维权", "法律援助", "律师", "法官", "检察官", "警察", "公安", "消防", "武警", "军队", "国防", "军事", "武器", "装备", "演习", "训练", "作战", "指挥", "情报", "反恐", "维和", "救灾", "应急", "救援", "事故", "灾难", "灾害", "疫情", "防控", "疫苗", "核酸", "隔离", "封控", "解封", "复工", "复产", "复学", "经济", "发展", "增长", "衰退", "危机", "复苏", "刺激", "政策", "财政", "货币", "税收", "补贴", "就业", "失业", "社保", "医保", "养老", "教育", "医疗", "住房", "物价", "消费", "收入", "贫富", "差距", "公平", "正义", "平等", "人权", "自由", "民主", "法治", "治理", "效能", "服务", "创新", "协调", "绿色", "开放", "共享", "现代化", "强国", "复兴", "中国梦", "一带一路", "双循环", "高质量", "共同富裕", "碳达峰", "碳中和", "环保", "生态", "气候", "能源", "资源", "可持续", "发展", "转型", "升级", "改革", "开放", "创新", "创业", "科技", "人才", "教育", "文化", "自信", "文明", "和谐", "美丽", "平安", "幸福", "健康", "快乐", "美好生活", "新时代", "新征程", "新局面", "新气象", "新作为", "新担当", "新使命", "新机遇", "新挑战", "新阶段", "新理念", "新格局"],
        "教育": ["教育", "学校", "考试", "学习", "学生", "老师", "培训", "课程", "大学", "毕业", "招生", "高考", "考研", "留学", "学位", "论文", "教材", "教学", "教研", "教师", "教授", "讲师", "助教", "辅导员", "班主任", "校长", "院长", "系主任", "教务处", "研究生院", "招生办", "就业办", "学生处", "团委", "学生会", "社团", "活动", "竞赛", "奖学金", "助学金", "贷款", "学费", "住宿费", "食堂", "宿舍", "图书馆", "实验室", "教学楼", "操场", "体育馆", "游泳馆", "艺术楼", "行政楼", "校园", "校风", "校训", "校徽", "校服", "校歌", "校庆", "校友", "校友会", "捐赠", "基金", "合作", "交流", "交换", "访问", "留学", "出国", "回国", "海归", "外教", "国际", "双语", "外语", "英语", "日语", "韩语", "法语", "德语", "西班牙语", "俄语", "汉语", "普通话", "方言", "文学", "历史", "哲学", "政治", "经济", "管理", "法学", "社会学", "心理学", "教育学", "体育学", "艺术学", "工学", "理学", "医学", "农学", "林学", "牧业", "渔业", "矿业", "能源", "材料", "机械", "电子", "电气", "自动化", "计算机", "软件", "网络", "通信", "信息", "数据", "人工智能", "机器人", "航天", "航空", "航海", "交通", "土木", "建筑", "水利", "环境", "安全", "化工", "制药", "生物", "食品", "轻工", "纺织", "服装", "设计", "传媒", "新闻", "出版", "广告", "营销", "旅游", "酒店管理", "会展", "物流", "供应链", "电子商务", "金融", "会计", "审计", "统计", "精算", "保险", "投资", "银行", "证券", "期货", "基金", "财富", "税务", "财政", "公共", "政府", "政策", "管理", "行政", "公共管理", "社会工作", "社会保障", "人力资源", "劳动", "就业", "职业", "技能", "培训", "认证", "考试", "证书", "资格", "职称", "学历", "学位", "本科", "硕士", "博士", "博士后", "院士", "教授", "研究员", "工程师", "设计师", "医师", "律师", "会计师", "经济师", "统计师", "审计师", "评估师", "咨询师", "培训师", "教练", "导师", "顾问", "专家", "学者", "科学家", "发明家", "创业者", "企业家", "投资人", "经理人", "高管", "总监", "经理", "主管", "专员", "助理", "实习生", "应届", "校招", "社招", "内推", "猎头", "招聘", "求职", "面试", "笔试", "offer", "薪资", "福利", "五险一金", "年终奖", "绩效", "晋升", "跳槽", "转行", "创业", "副业", "兼职", "自由职业", "远程", "灵活就业"],
        "健康": ["健康", "医疗", "医院", "疾病", "药物", "养生", "运动", "饮食", "心理", "体检", "医生", "患者", "治疗", "手术", "疫苗", "营养", "健身", "保健", "护理", "康复", "预防", "诊断", "检查", "化验", "影像", "B超", "CT", "MRI", "X光", "心电图", "脑电图", "血压", "血糖", "血脂", "尿酸", "胆固醇", "体重", "BMI", "体脂", "肌肉", "骨骼", "关节", "脊柱", "颈椎", "腰椎", "膝盖", "脚踝", "手腕", "肩膀", "背部", "腹部", "胸部", "头部", "眼部", "耳部", "鼻部", "口腔", "牙齿", "牙龈", "咽喉", "气管", "肺", "心脏", "血管", "血液", "淋巴", "免疫", "内分泌", "消化", "吸收", "排泄", "肾脏", "肝脏", "胆囊", "胰腺", "脾脏", "胃", "肠道", "大肠", "小肠", "阑尾", "直肠", "膀胱", "尿道", "前列腺", "卵巢", "子宫", "乳腺", "皮肤", "毛发", "指甲", "神经", "大脑", "小脑", "脑干", "脊髓", "神经元", "突触", "激素", "酶", "抗体", "抗原", "细菌", "病毒", "真菌", "寄生虫", "感染", "发炎", "过敏", "中毒", "损伤", "创伤", "烧伤", "冻伤", "烫伤", "割伤", "擦伤", "骨折", "脱位", "扭伤", "拉伤", "撕裂", "出血", "淤血", "水肿", "红肿", "疼痛", "瘙痒", "麻木", "头晕", "头痛", "恶心", "呕吐", "腹泻", "便秘", "发烧", "发冷", "出汗", "口干", "口苦", "口臭", "耳鸣", "听力", "视力", "近视", "远视", "散光", "老花", "白内障", "青光眼", "视网膜", "角膜", "结膜", "虹膜", "瞳孔", "泪腺", "眼睑", "眉毛", "睫毛", "头发", "头皮", "脱发", "白发", "头皮屑", "痤疮", "粉刺", "黑头", "毛孔", "皱纹", "色斑", "暗沉", "干燥", "油腻", "敏感", "红肿", "皮炎", "湿疹", "荨麻疹", "银屑病", "白癜风", "脚气", "灰指甲", "甲沟炎", "鸡眼", "老茧", "疤痕", "痘印", "痘坑", "妊娠纹", "肥胖纹", "黑眼圈", "眼袋", "细纹", "鱼尾纹", "法令纹", "颈纹", "抬头纹", "川字纹", "笑纹", "泪沟", "苹果肌", "颧骨", "下颌线", "咬肌", "太阳穴", "额头", "脸颊", "下巴", "嘴唇", "唇纹", "口红", "唇膏", "唇彩", "唇釉", "眉笔", "眉粉", "眼影", "眼线", "睫毛膏", "腮红", "粉底", "遮瑕", "散粉", "定妆", "修容", "高光", "阴影", "化妆", "卸妆", "护肤", "洁面", "爽肤水", "精华", "乳液", "面霜", "眼霜", "面膜", "防晒", "隔离", "补水", "保湿", "滋润", "控油", "美白", "提亮", "紧致", "抗老", "抗氧化", "去角质", "深层清洁", "舒缓", "修复", "敏感肌", "痘痘肌", "干性肌", "油性肌", "混合肌", "中性肌", "健康饮食", "均衡营养", "蛋白质", "碳水", "脂肪", "维生素", "矿物质", "膳食纤维", "水分", "卡路里", "热量", "减肥", "增肌", "塑形", "瑜伽", "普拉提", "有氧", "无氧", "力量训练", "HIIT", "跑步", "游泳", "骑行", "徒步", "登山", "球类", "团队运动", "个人运动", "室内运动", "户外运动", "晨练", "夜跑", "健身房", "居家健身", "运动装备", "运动鞋", "运动服", "运动耳机", "智能手表", "心率监测", "睡眠监测", "健康管理", "体检", "定期检查", "疫苗接种", "疾病筛查", "早期发现", "及时治疗", "遵医嘱", "按时服药", "定期复诊", "康复训练", "心理健康", "心理咨询", "心理治疗", "压力管理", "情绪调节", "冥想", "正念", "放松", "睡眠", "作息", "规律", "熬夜", "失眠", "多梦", "早醒", "嗜睡", "打鼾", "睡眠呼吸暂停", "睡前习惯", "睡眠环境", "枕头", "床垫", "被子", "温度", "湿度", "光线", "安静"],
        "生活": ["生活", "美食", "旅游", "购物", "家居", "时尚", "汽车", "房产", "宠物", "亲子", "摄影", "旅行", "设计", "装修", "家电", "家具", "厨具", "餐具", "卫浴", "卧室", "客厅", "厨房", "书房", "阳台", "花园", "庭院", "装修风格", "现代", "简约", "北欧", "日式", "中式", "美式", "法式", "轻奢", "复古", "工业风", "田园风", "地中海", "东南亚", "材料", "瓷砖", "地板", "墙面", "涂料", "壁纸", "吊顶", "灯具", "窗帘", "地毯", "装饰品", "绿植", "花卉", "盆栽", "鱼缸", "水族", "宠物", "狗", "猫", "鸟", "鱼", "仓鼠", "兔子", "龙猫", "爬虫", "宠物用品", "狗粮", "猫粮", "玩具", "窝", "笼子", "美容", "洗澡", "疫苗", "驱虫", "绝育", "训练", "寄养", "宠物医院", "亲子", "育儿", "早教", "幼儿园", "小学", "初中", "高中", "家教", "辅导班", "兴趣班", "艺术", "音乐", "舞蹈", "绘画", "书法", "乐器", "钢琴", "吉他", "小提琴", "古筝", "二胡", "琵琶", "笛子", "架子鼓", "贝斯", "声乐", "合唱", "乐队", "演出", "比赛", "考级", "证书", "美食", "烹饪", "烘焙", "烧烤", "火锅", "西餐", "中餐", "日料", "韩料", "泰餐", "意餐", "法餐", "甜点", "蛋糕", "面包", "饼干", "冰淇淋", "奶茶", "咖啡", "饮品", "酒水", "红酒", "白酒", "啤酒", "鸡尾酒", "食材", "调料", "厨具", "餐具", "食谱", "菜谱", "美食探店", "餐厅推荐", "外卖", "团购", "优惠券", "促销", "打折", "购物节", "双十一", "双十二", "618", "年货节", "情人节", "圣诞节", "生日礼物", "纪念日", "礼品", "奢侈品", "轻奢", "快时尚", "潮牌", "设计师品牌", "定制", "手工", "DIY", "手账", "文具", "笔记本", "钢笔", "墨水", "胶带", "贴纸", "印章", "插画", "摄影", "相机", "镜头", "三脚架", "闪光灯", "滤镜", "修图", "后期", "调色", "构图", "人像", "风景", "静物", "美食摄影", "旅行摄影", "婚礼摄影", "儿童摄影", "写真", "街拍", "胶片", "数码", "单反", "微单", "卡片机", "手机摄影", "vlog", "短视频", "直播", "自媒体", "公众号", "小红书", "抖音", "快手", "B站", "微博", "知乎", "豆瓣", "汽车", "轿车", "SUV", "MPV", "跑车", "电动车", "新能源", "混动", "燃油", "二手车", "新车", "试驾", "评测", "保养", "维修", "改装", "配件", "保险", "年检", "违章", "停车", "加油", "充电", "充电桩", "续航", "油耗", "配置", "价格", "性价比", "品牌", "车型", "颜色", "内饰", "外观", "空间", "安全", "智能", "自动驾驶", "车联网", "导航", "娱乐", "音响", "空调", "座椅", "天窗", "轮毂", "轮胎", "刹车", "悬挂", "发动机", "变速箱", "底盘", "车身", "车漆", "贴膜", "脚垫", "坐垫", "方向盘套", "行车记录仪", "倒车影像", "雷达", "防盗", "年检", "过户", "上牌", "摇号", "限行", "政策", "房产", "住宅", "公寓", "别墅", "写字楼", "商铺", "厂房", "仓库", "土地", "买卖", "租赁", "中介", "房源", "户型", "面积", "朝向", "楼层", "采光", "通风", "物业", "物业费", "停车费", "水电费", "燃气费", "暖气费", "维修基金", "契税", "个税", "首付", "贷款", "月供", "利率", "公积金", "商业贷款", "组合贷款", "等额本息", "等额本金", "提前还款", "房产证", "不动产证", "网签", "备案", "过户", "交房", "装修", "验房", "收房", "维权", "小区", "社区", "邻里", "物业", "保安", "保洁", "绿化", "健身", "泳池", "会所", "儿童乐园", "老年活动中心", "垃圾处理", "垃圾分类", "电梯", "门禁", "监控", "消防", "安全", "充电桩", "快递柜", "便利店", "超市", "菜市场", "学校", "医院", "公园", "地铁", "公交", "商圈", "交通", "配套", "学区房", "地铁房", "江景房", "湖景房", "山景房", "海景房", "投资", "刚需", "改善", "置换", "炒房", "房价", "涨跌", "政策", "调控", "限购", "限贷", "限售", "限价", "摇号", "积分", "落户", "学区", "学位", "划片", "入学", "转学", "插班", "学籍", "户籍", "居住证", "社保", "个税", "年限", "资格", "条件", "流程", "材料", "证明", "公证", "过户", "继承", "赠与", "抵押", "查封", "拍卖", "法拍房", "烂尾楼", "维权", "退房", "赔偿", "违约金", "合同", "条款", "补充协议", "定金", "订金", "首付分期", "装修贷", "消费贷", "经营贷", "信用贷", "抵押贷", "质押贷", "担保", "联保", "互保", "保险", "意外险", "医疗险", "重疾险", "寿险", "年金险", "理财险", "车险", "家财险", "宠物险", "旅游险", "航空险", "铁路险", "海运险", "责任保险", "信用保险", "保证保险", "农业保险", "工伤保险", "失业保险", "生育保险", "养老保险", "医疗保险", "社保", "公积金", "缴存", "提取", "贷款", "买房", "装修", "租房", "销户", "转移", "合并", "查询", "明细", "基数", "比例", "上限", "下限", "调整", "补缴", "滞纳金", "利息", "复利", "罚息", "违约金", "手续费", "服务费", "管理费", "托管费", "年费", "工本费", "印花税", "契税", "增值税", "消费税", "营业税", "关税", "企业所得税", "个人所得税", "房产税", "土地增值税", "印花税", "城建税", "教育费附加", "地方教育附加", "环境保护税", "资源税", "车船税", "船舶吨税", "烟叶税", "耕地占用税", "契税", "土地使用税", "房产税", "印花税", "城建税", "教育费附加", "地方教育附加", "环境保护税", "资源税", "车船税", "船舶吨税", "烟叶税", "耕地占用税", "契税", "土地使用税", "房产税", "印花税", "城建税", "教育费附加", "地方教育附加", "环境保护税", "资源税", "车船税", "船舶吨税", "烟叶税", "耕地占用税", "契税", "土地使用税", "房产税", "印花税", "城建税", "教育费附加", "地方教育附加", "环境保护税", "资源税", "车船税", "船舶吨税", "烟叶税", "耕地占用税", "契税", "土地使用税"],
    }
    
    word_counts: dict = {}
    
    for behavior in behaviors:
        if behavior.action_type == "view" and behavior.target_id:
            news = db.get(News, behavior.target_id)
            if news and news.category:
                word_counts[news.category] = word_counts.get(news.category, 0) + 3
        
        if behavior.action_type == "generate" and behavior.target_id:
            news = db.get(News, behavior.target_id)
            if news:
                if news.category:
                    word_counts[news.category] = word_counts.get(news.category, 0) + 5
                
                text = ""
                if news.title:
                    text += news.title + " "
                if news.summary:
                    text += news.summary + " "
                
                words = re.findall(r'[\u4e00-\u9fa5]{2,}|[A-Za-z]+', text)
                for word in words:
                    if word.lower() in stopwords or len(word) < 2:
                        continue
                    word_counts[word] = word_counts.get(word, 0) + 2
    
    for news in news_items:
        if news.category:
            word_counts[news.category] = word_counts.get(news.category, 0) + 1
        
        text = ""
        if news.title:
            text += news.title + " "
        if news.summary:
            text += news.summary + " "
        
        words = re.findall(r'[\u4e00-\u9fa5]{2,}|[A-Za-z]+', text)
        for word in words:
            if word.lower() in stopwords or len(word) < 2:
                continue
            word_counts[word] = word_counts.get(word, 0) + 1
    
    for category, keywords in category_keywords.items():
        if word_counts.get(category, 0) > 0:
            for kw in keywords[:5]:
                if kw not in word_counts:
                    word_counts[kw] = word_counts.get(category, 0) // 3
    
    words = []
    for word, count in word_counts.items():
        category = next((k for k, v in category_keywords.items() if word in v), "其他")
        words.append({
            "text": word,
            "value": count,
            "category": category,
        })
    
    words.sort(key=lambda x: x["value"], reverse=True)
    
    return {"words": words[:50]}


@router.get("/content")
def get_content_list(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    try:
        query = select(News)
        
        if status:
            query = query.where(News.review_status == status)
        
        if search:
            query = query.where(
                (News.title.contains(search)) | (News.source.contains(search))
            )
        
        news_items = db.exec(query).all()
        total = len(news_items)
        
        query = query.order_by(News.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        news_items = db.exec(query).all()
        
        result = []
        for news in news_items:
            result.append({
                "id": news.id,
                "title": news.title,
                "source": news.source if news.source else "",
                "category": news.category if news.category else "",
                "quality_score": news.quality_score if hasattr(news, 'quality_score') else 0,
                "review_status": news.review_status if hasattr(news, 'review_status') else "pending",
                "review_note": news.review_note if hasattr(news, 'review_note') else "",
                "crawl_status": news.crawl_status,
                "views": news.views,
                "created_at": news.created_at,
                "published_at": news.published_at,
            })
        
        return {"data": result, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        logger.exception(f"Get content list failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"获取内容列表失败: {str(e)}")


class ReviewRequest(BaseModel):
    note: Optional[str] = None


@router.put("/content/{news_id}/approve")
def approve_content(
    news_id: int,
    review_req: Optional[ReviewRequest] = None,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    
    news.review_status = "published"
    news.review_note = review_req.note if review_req else None
    news.reviewed_by = admin.id
    news.reviewed_at = datetime.utcnow().isoformat()
    news.updated_at = datetime.utcnow().isoformat()
    
    db.add(AuditLog(
        user_id=admin.id,
        action="approve_content",
        target=f"news:{news_id}",
        detail=f"标题: {news.title}",
    ))
    
    db.commit()
    db.refresh(news)
    
    return {"id": news.id, "review_status": news.review_status, "reviewed_at": news.reviewed_at}


@router.put("/content/{news_id}/reject")
def reject_content(
    news_id: int,
    review_req: ReviewRequest,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    
    news.review_status = "rejected"
    news.review_note = review_req.note
    news.reviewed_by = admin.id
    news.reviewed_at = datetime.utcnow().isoformat()
    news.updated_at = datetime.utcnow().isoformat()
    
    db.add(AuditLog(
        user_id=admin.id,
        action="reject_content",
        target=f"news:{news_id}",
        detail=f"标题: {news.title}, 原因: {review_req.note}",
    ))
    
    db.commit()
    db.refresh(news)
    
    return {"id": news.id, "review_status": news.review_status, "reviewed_at": news.reviewed_at}


@router.get("/content/{news_id}")
def get_content_detail(
    news_id: int,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    news = db.get(News, news_id)
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    
    return {
        "id": news.id,
        "title": news.title,
        "summary": news.summary,
        "content": news.content,
        "category": news.category,
        "source": news.source,
        "original_url": news.original_url,
        "quality_score": news.quality_score,
        "review_status": news.review_status,
        "review_note": news.review_note,
        "crawl_status": news.crawl_status,
        "views": news.views,
        "is_trending": news.is_trending,
        "created_at": news.created_at,
        "published_at": news.published_at,
        "updated_at": news.updated_at,
    }


@router.get("/logs")
def get_audit_logs(
    search: Optional[str] = None,
    action: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_session),
    admin: AdminUser = Depends(get_admin_user),
):
    query = select(AuditLog)
    
    if search:
        query = query.where(
            (AuditLog.action.contains(search)) | 
            (AuditLog.target.contains(search)) | 
            (AuditLog.detail.contains(search))
        )
    
    if action:
        query = query.where(AuditLog.action == action)
    
    total = len(db.exec(query).all())
    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = db.exec(query).all()
    
    result = []
    for log in logs:
        admin_user = db.get(AdminUser, log.user_id) if log.user_id else None
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": admin_user.username if admin_user else None,
            "action": log.action,
            "target": log.target,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
        })
    
    return {"data": result, "total": total, "page": page, "page_size": page_size}


def ensure_default_admin(db: Session) -> None:
    existing = db.exec(select(AdminUser)).first()
    if existing is not None:
        return

    default_admin = AdminUser(
        username="admin",
        email="admin@example.com",
        hashed_password=hash_password("admin123"),
        is_superuser=True,
    )
    db.add(default_admin)

    default_config = SystemConfig(
        key="default_api_key",
        value="sk-73833a84c5434c2f84be3454d73f95d9",
        description="默认API密钥",
    )
    db.add(default_config)

    db.commit()
    logger.info("Default admin user and config created")