from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.user_crud import verify_password, create_user
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.utils.jwt_utils import create_access_token
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = verify_password(db, request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "role": user.role}


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = verify_password(db, user.username, user.password)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db, user)