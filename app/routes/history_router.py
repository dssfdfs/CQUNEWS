from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.history import create_history, get_history_list, get_history_by_id, delete_history
from app.schemas.history import HistoryCreate, HistoryResponse, HistoryListResponse
from app.utils.jwt_utils import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/api/history", tags=["history"])


@router.post("/", response_model=HistoryResponse)
def add_history(
    history: HistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_history(db, current_user.id, history)


@router.get("/", response_model=HistoryListResponse)
def get_history(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 10
    return get_history_list(db, current_user.id, page, page_size)


@router.get("/{history_id}", response_model=HistoryResponse)
def get_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = get_history_by_id(db, current_user.id, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    return history


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = delete_history(db, current_user.id, history_id)
    if not success:
        raise HTTPException(status_code=404, detail="History not found")
    return None