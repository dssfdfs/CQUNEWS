from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.history import History
from app.schemas.history import HistoryCreate


def create_history(db: Session, user_id: int, history: HistoryCreate):
    db_history = History(
        user_id=user_id,
        content=history.content,
        summary=history.summary,
        titles=history.titles.dict(),
        quality=history.quality.dict() if history.quality else None
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history


def get_history_list(db: Session, user_id: int, page: int = 1, page_size: int = 10):
    skip = (page - 1) * page_size
    total = db.query(func.count(History.id)).filter(History.user_id == user_id).scalar()
    items = db.query(History)\
        .filter(History.user_id == user_id)\
        .order_by(History.created_at.desc())\
        .offset(skip)\
        .limit(page_size)\
        .all()
    total_pages = (total + page_size - 1) // page_size
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


def get_history_by_id(db: Session, user_id: int, history_id: int):
    return db.query(History)\
        .filter(History.user_id == user_id, History.id == history_id)\
        .first()


def delete_history(db: Session, user_id: int, history_id: int):
    history = get_history_by_id(db, user_id, history_id)
    if history:
        db.delete(history)
        db.commit()
        return True
    return False