import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from random import randint, choice
import json

from sqlmodel import Session, select

from app.database import engine
from app.models import User, UserBehavior, News, Feedback, UserProfile, UserSettings
from app.auth import hash_password


def create_test_users(session: Session):
    existing = session.exec(select(User)).all()
    if existing:
        print(f"已存在 {len(existing)} 个用户，跳过创建测试用户")
        return [u.id for u in existing]

    users = [
        {"username": "test_user1", "email": "test1@example.com", "password": "123456"},
        {"username": "test_user2", "email": "test2@example.com", "password": "123456"},
        {"username": "test_user3", "email": "test3@example.com", "password": "123456"},
        {"username": "test_user4", "email": "test4@example.com", "password": "123456"},
        {"username": "test_user5", "email": "test5@example.com", "password": "123456"},
    ]

    user_ids = []
    for u in users:
        now = datetime.utcnow().isoformat()
        user = User(
            username=u["username"],
            email=u["email"],
            password_hash=hash_password(u["password"]),
            created_at=now,
            updated_at=now,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        user_ids.append(user.id)

        profile = UserProfile(user_id=user.id, created_at=now, updated_at=now)
        settings = UserSettings(user_id=user.id, created_at=now, updated_at=now)
        session.add(profile)
        session.add(settings)

    session.commit()
    print(f"创建了 {len(user_ids)} 个测试用户")
    return user_ids


def create_test_news(session: Session):
    existing = session.exec(select(News)).all()
    if existing:
        print(f"已存在 {len(existing)} 条新闻，跳过创建测试新闻")
        return [n.id for n in existing]

    categories = ["tech", "finance", "sports", "entertainment", "politics", "education", "health", "life"]
    news_items = []

    titles = {
        "tech": ["人工智能突破：新一代大模型发布", "5G技术商用进展顺利", "云计算市场持续增长"],
        "finance": ["股市今日高开低走", "央行宣布降息", "企业财报季来临"],
        "sports": ["世界杯预选赛战报", "NBA季后赛战况", "奥运会筹备进展"],
        "entertainment": ["春节档电影预售火爆", "音乐节阵容公布", "新剧开播反响热烈"],
        "politics": ["两会召开时间确定", "政策解读发布会", "地方政府工作报告"],
        "education": ["高考改革方案出台", "在线教育发展趋势", "职业教育政策利好"],
        "health": ["春季养生指南", "疫苗接种进展", "心理健康科普"],
        "life": ["美食探店推荐", "旅游攻略分享", "家居装修灵感"],
    }

    for category in categories:
        for i, title in enumerate(titles[category]):
            now = (datetime.utcnow() - timedelta(days=randint(0, 6))).isoformat()
            news = News(
                title=f"{title} - {i+1}",
                category=category,
                source="测试来源",
                original_url=f"https://example.com/news/{category}-{i+1}",
                summary=f"这是关于{title}的摘要内容",
                content=f"这是关于{title}的详细内容...",
                review_status="approved",
                crawl_status=1,
                created_at=now,
            )
            news_items.append(news)

    session.add_all(news_items)
    session.commit()

    news_ids = [n.id for n in news_items]
    print(f"创建了 {len(news_ids)} 条测试新闻")
    return news_ids


def create_test_behavior(session: Session, user_ids: list[int], news_ids: list[int]):
    existing = session.exec(select(UserBehavior)).all()
    if existing:
        print(f"已存在 {len(existing)} 条行为记录，跳过创建")
        return

    behaviors = []
    now = datetime.utcnow()

    for day_offset in range(7):
        date = now - timedelta(days=day_offset)
        for hour in range(6, 22, 2):
            for _ in range(randint(2, 8)):
                user_id = choice(user_ids)
                action_type = choice(["generate", "view", "generate", "view", "view"])
                target_id = choice(news_ids) if news_ids else None

                extra_data = None
                if action_type == "generate":
                    duration_ms = randint(2000, 15000)
                    extra_data = json.dumps({"duration_ms": duration_ms})

                timestamp = (date + timedelta(hours=hour, minutes=randint(0, 59))).isoformat()

                behavior = UserBehavior(
                    user_id=user_id,
                    action_type=action_type,
                    target_id=target_id,
                    extra_data=extra_data,
                    timestamp=timestamp,
                )
                behaviors.append(behavior)

    session.add_all(behaviors)
    session.commit()
    print(f"创建了 {len(behaviors)} 条测试用户行为记录")


def create_test_feedback(session: Session, user_ids: list[int]):
    existing = session.exec(select(Feedback)).all()
    if existing:
        print(f"已存在 {len(existing)} 条反馈，跳过创建")
        return

    feedback_contents = [
        {"content": "系统使用体验很好，希望能增加更多新闻源", "status": "pending"},
        {"content": "生成摘要的速度有些慢，建议优化", "status": "pending"},
        {"content": "界面设计美观，操作流畅", "status": "resolved"},
        {"content": "希望能支持更多语言的摘要生成", "status": "pending"},
    ]

    for i, f in enumerate(feedback_contents):
        user_id = user_ids[i % len(user_ids)]
        feedback = Feedback(
            user_id=user_id,
            content=f["content"],
            status=f["status"],
            created_at=datetime.utcnow().isoformat(),
        )
        session.add(feedback)

    session.commit()
    print(f"创建了 {len(feedback_contents)} 条测试反馈")


def main():
    print("=" * 60)
    print("生成测试数据脚本")
    print("=" * 60)

    with Session(engine) as session:
        print("\n1. 创建测试用户...")
        user_ids = create_test_users(session)

        print("\n2. 创建测试新闻...")
        news_ids = create_test_news(session)

        print("\n3. 创建测试用户行为记录...")
        create_test_behavior(session, user_ids, news_ids)

        print("\n4. 创建测试反馈...")
        create_test_feedback(session, user_ids)

    print("\n" + "=" * 60)
    print("测试数据生成完成！")
    print("=" * 60)
    print("\n现在刷新管理员仪表盘，应该能看到非0的统计数据了。")


if __name__ == "__main__":
    main()