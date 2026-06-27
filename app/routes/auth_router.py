from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.crud.user_crud import verify_password, create_user, get_user_by_id, get_all_users, update_user, get_user_by_username
from app.schemas.auth import LoginRequest, TokenResponse
from app.utils.hash_utils import hash_password
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.jwt_utils import create_access_token
from app.database import get_db
from typing import List

router = APIRouter(prefix="/auth", tags=["auth"])
templates = Jinja2Templates(directory="app/templates")


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, request.username)
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在，请先注册")
    
    hashed_input_password = hash_password(request.password)
    if user.password != hashed_input_password:
        raise HTTPException(status_code=401, detail="密码错误")
    
    token = create_access_token({"sub": user.username, "role": user.role, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "role": user.role}


@router.get("/register-page")
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@router.get("/forgot-password-page")
def forgot_password_page(request: Request):
    return templates.TemplateResponse("forgot_password.html", {"request": request})


@router.post("/forgot-password")
def forgot_password(request: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, request.username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    default_password = "123456"
    user.password = hash_password(default_password)
    db.commit()
    db.refresh(user)
    
    return {"message": "密码已重置为默认密码123456"}


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 检查用户名是否已存在
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在，请更换用户名")
    return create_user(db, user)


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = get_all_users(db)
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def modify_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
