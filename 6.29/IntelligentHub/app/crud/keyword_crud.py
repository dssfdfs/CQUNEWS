from sqlalchemy.orm import Session
from app.models.keyword import Keyword


def get_or_create_keyword(db: Session, word: str):
    keyword = db.query(Keyword).filter(Keyword.word == word).first()
    if not keyword:
        keyword = Keyword(word=word, frequency=1)
        db.add(keyword)
        db.commit()
        db.refresh(keyword)
    else:
        keyword.frequency += 1
        db.commit()
        db.refresh(keyword)
    return keyword


def get_all_keywords(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Keyword).order_by(Keyword.frequency.desc()).offset(skip).limit(limit).all()