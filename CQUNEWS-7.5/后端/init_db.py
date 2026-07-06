import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import init_db, get_session
from app.models import AdminUser, SystemConfig
from app.auth import hash_password

def create_admin_user(db):
    existing = db.exec(
        __import__("sqlmodel").select(AdminUser).where(AdminUser.username == "admin")
    ).first()
    if not existing:
        admin = AdminUser(
            username="admin",
            email="admin@cqunews.com",
            hashed_password=hash_password("admin123"),
            is_superuser=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created: admin/admin123")

def create_default_config(db):
    existing = db.exec(
        __import__("sqlmodel").select(SystemConfig).where(SystemConfig.key == "default_api_key")
    ).first()
    if not existing:
        config = SystemConfig(
            key="default_api_key",
            value="",
            description="默认API密钥",
        )
        db.add(config)
        db.commit()
        print("Default system config created")

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialized.")
    
    print("Creating admin user...")
    with get_session() as db:
        create_admin_user(db)
        create_default_config(db)
    
    print("Database setup completed successfully!")