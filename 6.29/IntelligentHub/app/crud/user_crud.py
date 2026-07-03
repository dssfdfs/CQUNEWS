from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.hash_utils import hash_password
from typing import List


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(db: Session) -> List[User]:
    return db.query(User).all()


def create_user(db: Session, user: UserCreate):
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user_update: UserUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    
    if user_update.username is not None:
        db_user.username = user_update.username
    if user_update.password is not None:
        db_user.password = hash_password(user_update.password)
    if user_update.role is not None:
        db_user.role = user_update.role
    
    db.commit()
    db.refresh(db_user)
    return db_user


def verify_password(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    hashed_password = hash_password(password)
    if user.password == hashed_password:
        return user
    return None
