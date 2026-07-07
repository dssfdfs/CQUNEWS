import json
import pytest
import httpx
import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.main import app
from app.database import engine
from app.models import User, News, EmailVerificationCode, UserFavoriteNews
from app.auth import hash_password


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def client():
    return httpx.AsyncClient(app=app, base_url="http://test")


@pytest.fixture(scope="module")
def test_user():
    with Session(engine) as db:
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash=hash_password("Test1234"),
            account_status="active",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        yield user
        db.delete(user)
        db.commit()


@pytest.fixture(scope="module")
def test_news():
    with Session(engine) as db:
        news = News(
            title="测试新闻标题",
            source="测试来源",
            category="科技",
            summary="测试摘要",
            content="测试内容",
            published_at=datetime.utcnow().isoformat(),
            audit_status=1,
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(news)
        db.commit()
        db.refresh(news)
        yield news
        db.delete(news)
        db.commit()


@pytest.fixture(scope="module")
def test_token(client, test_user):
    async def get_token():
        response = await client.post(
            "/api/auth/login",
            json={"account": "testuser", "password": "Test1234"},
        )
        data = response.json()
        return data["data"]["access_token"]

    return asyncio.run(get_token())


class TestAccountStatus:
    """测试账号禁用功能"""

    def test_login_disabled_account(self, client):
        with Session(engine) as db:
            user = User(
                username="disabled_user",
                email="disabled@example.com",
                password_hash=hash_password("Test1234"),
                account_status="disabled",
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )
            db.add(user)
            db.commit()

        async def test():
            response = await client.post(
                "/api/auth/login",
                json={"account": "disabled_user", "password": "Test1234"},
            )
            data = response.json()
            assert response.status_code == 403
            assert "已被禁用" in data["detail"]

        asyncio.run(test())

        with Session(engine) as db:
            db.delete(user)
            db.commit()

    def test_verify_token_disabled(self, client):
        with Session(engine) as db:
            user = User(
                username="verify_disabled",
                email="verify_disabled@example.com",
                password_hash=hash_password("Test1234"),
                account_status="active",
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )
            db.add(user)
            db.commit()

        async def test():
            login_response = await client.post(
                "/api/auth/login",
                json={"account": "verify_disabled", "password": "Test1234"},
            )
            token = login_response.json()["data"]["access_token"]

            with Session(engine) as db:
                u = db.get(User, user.id)
                u.account_status = "disabled"
                db.commit()

            verify_response = await client.get(
                "/api/auth/verify-token",
                headers={"Authorization": f"Bearer {token}"},
            )
            data = verify_response.json()
            assert data["data"]["account_status"] == "disabled"

        asyncio.run(test())

        with Session(engine) as db:
            db.delete(user)
            db.commit()

    def test_login_active_account(self, client, test_user):
        async def test():
            response = await client.post(
                "/api/auth/login",
                json={"account": "testuser", "password": "Test1234"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["code"] == 0
            assert "access_token" in data["data"]

        asyncio.run(test())


class TestEmailVerification:
    """测试邮箱验证码重置密码"""

    def test_send_code(self, client, test_user):
        async def test():
            response = await client.post(
                "/api/auth/send-verification-code",
                json={"email": test_user.email},
            )
            data = response.json()
            assert data["code"] == 0 or "已发送" in data.get("message", "")

        asyncio.run(test())

    def test_send_code_cooling(self, client, test_user):
        async def test():
            await client.post(
                "/api/auth/send-verification-code",
                json={"email": test_user.email},
            )
            response = await client.post(
                "/api/auth/send-verification-code",
                json={"email": test_user.email},
            )
            data = response.json()
            assert data["code"] == 1
            assert "60秒" in data["message"]

        asyncio.run(test())

    def test_verify_code(self, client, test_user):
        async def test():
            await client.post(
                "/api/auth/send-verification-code",
                json={"email": test_user.email},
            )

            with Session(engine) as db:
                code_record = db.exec(
                    select(EmailVerificationCode).where(EmailVerificationCode.email == test_user.email)
                ).first()
                assert code_record is not None

                response = await client.post(
                    "/api/auth/verify-code",
                    json={"email": test_user.email, "code": code_record.code},
                )
                data = response.json()
                assert data["code"] == 0

        asyncio.run(test())

    def test_reset_password(self, client, test_user):
        async def test():
            await client.post(
                "/api/auth/send-verification-code",
                json={"email": test_user.email},
            )

            with Session(engine) as db:
                code_record = db.exec(
                    select(EmailVerificationCode).where(EmailVerificationCode.email == test_user.email)
                ).first()

                response = await client.post(
                    "/api/auth/reset-password-with-code",
                    json={
                        "email": test_user.email,
                        "code": code_record.code,
                        "new_password": "NewPass123",
                    },
                )
                data = response.json()
                assert data["code"] == 0

                login_response = await client.post(
                    "/api/auth/login",
                    json={"account": "testuser", "password": "NewPass123"},
                )
                assert login_response.status_code == 200

        asyncio.run(test())


class TestNewsFavorite:
    """测试新闻收藏功能"""

    def test_toggle_favorite(self, client, test_token, test_news):
        async def test():
            response = await client.post(
                f"/api/news/{test_news.id}/favorite",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            data = response.json()
            assert data["code"] == 0
            assert data["is_favorite"] is True

            response2 = await client.post(
                f"/api/news/{test_news.id}/favorite",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            data2 = response2.json()
            assert data2["code"] == 0
            assert data2["is_favorite"] is False

        asyncio.run(test())

    def test_get_favorites(self, client, test_token, test_news):
        async def test():
            await client.post(
                f"/api/news/{test_news.id}/favorite",
                headers={"Authorization": f"Bearer {test_token}"},
            )

            response = await client.get(
                "/api/news/favorites",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            data = response.json()
            assert data["code"] == 0
            assert len(data["data"]) >= 1

        asyncio.run(test())

    def test_favorite_not_logged_in(self, client, test_news):
        async def test():
            response = await client.post(f"/api/news/{test_news.id}/favorite")
            data = response.json()
            assert data["code"] == 1
            assert "未登录" in data["message"]

        asyncio.run(test())


class TestNewsTodayFilter:
    """测试今日新闻时间过滤"""

    def test_today_only_filter(self, client, test_token):
        async def test():
            response = await client.get(
                "/api/news?today_only=true",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            data = response.json()
            assert data["code"] == 0
            for item in data.get("data", []):
                if "published_at" in item:
                    date_str = item["published_at"][:10]
                    today = datetime.utcnow().strftime("%Y-%m-%d")
                    assert date_str == today

        asyncio.run(test())

    def test_no_today_filter(self, client, test_token):
        async def test():
            response = await client.get(
                "/api/news",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            data = response.json()
            assert data["code"] == 0

        asyncio.run(test())


class TestBatchReview:
    """测试批量审核功能"""

    def test_batch_approve_reject(self, client):
        with Session(engine) as db:
            admin = User(
                username="test_admin",
                email="admin@example.com",
                password_hash=hash_password("Admin1234"),
                account_status="active",
                is_admin=True,
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )
            db.add(admin)
            db.commit()

        async def test():
            login_response = await client.post(
                "/api/auth/login",
                json={"account": "test_admin", "password": "Admin1234"},
            )
            token = login_response.json()["data"]["access_token"]

            news_ids = []
            with Session(engine) as db:
                for i in range(3):
                    news = News(
                        title=f"待审核新闻{i}",
                        source="测试来源",
                        category="科技",
                        summary="测试摘要",
                        content="测试内容",
                        published_at=datetime.utcnow().isoformat(),
                        audit_status=0,
                        review_status="pending",
                        created_at=datetime.utcnow().isoformat(),
                    )
                    db.add(news)
                    db.commit()
                    db.refresh(news)
                    news_ids.append(news.id)

            approve_response = await client.put(
                "/api/admin/content/batch-review",
                headers={"Authorization": f"Bearer {token}"},
                json={"news_ids": news_ids, "action": "approve"},
            )
            data = approve_response.json()
            assert data.get("success_count") == 3 or data.get("code") == 0

            reject_response = await client.put(
                "/api/admin/content/batch-review",
                headers={"Authorization": f"Bearer {token}"},
                json={"news_ids": news_ids, "action": "reject"},
            )
            data = reject_response.json()
            assert data.get("success_count") == 3 or data.get("code") == 0

        asyncio.run(test())

        with Session(engine) as db:
            db.delete(admin)
            db.commit()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])