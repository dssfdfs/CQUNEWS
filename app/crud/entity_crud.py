from sqlalchemy.orm import Session
from app.models.entity import Entity


def get_or_create_entity(db: Session, name: str, entity_type: str = "company"):
    entity = db.query(Entity).filter(Entity.name == name).first()
    if not entity:
        entity = Entity(name=name, entity_type=entity_type)
        db.add(entity)
        db.commit()
        db.refresh(entity)
    return entity


def get_all_entities(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Entity).offset(skip).limit(limit).all()