from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.news_source_crud import create_news_source, get_news_source, get_all_news_sources, update_news_source, delete_news_source
from app.schemas.news_source import NewsSourceCreate, NewsSourceResponse
from app.database import get_db

router = APIRouter(prefix="/sources", tags=["news_sources"])


@router.post("/", response_model=NewsSourceResponse)
def create_source(source: NewsSourceCreate, db: Session = Depends(get_db)):
    return create_news_source(db, source)


@router.get("/", response_model=list[NewsSourceResponse])
def get_sources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_all_news_sources(db, skip, limit)


@router.get("/{source_id}", response_model=NewsSourceResponse)
def get_source(source_id: int, db: Session = Depends(get_db)):
    source = get_news_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.put("/{source_id}", response_model=NewsSourceResponse)
def update_source(source_id: int, source: NewsSourceCreate, db: Session = Depends(get_db)):
    updated = update_news_source(db, source_id, source)
    if not updated:
        raise HTTPException(status_code=404, detail="Source not found")
    return updated


@router.delete("/{source_id}", response_model=NewsSourceResponse)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    deleted = delete_news_source(db, source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    return deleted