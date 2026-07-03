from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.crud.user_crud import verify_password, create_user, get_user_by_id, get_all_users, update_user, get_user_by_username
from app.schemas.auth import LoginRequest, TokenResponse
from app.utils.hash_utils import hash_password
from app.schemas.user import UserCreate, AdminUserCreate, UserResponse, UserUpdate
from app.utils.jwt_utils import create_access_token
from app.database import get_db
from typing import List
import random
import string

router = APIRouter(prefix="/auth", tags=["auth"])
templates = Jinja2Templates(directory="app/templates")

captcha_store = {}


@router.get("/captcha")
def get_captcha():
    chars = string.ascii_letters + string.digits
    captcha = ''.join(random.choices(chars, k=4)).upper()
    session_key = str(random.randint(100000, 999999))
    captcha_store[session_key] = captcha
    return {"captcha": captcha, "session_key": session_key}


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.captcha or len(request.captcha) < 4:
        raise HTTPException(status_code=400, detail="请输入正确的验证码")
    
    if not request.session_key or request.session_key not in captcha_store:
        raise HTTPException(status_code=400, detail="验证码已失效，请刷新重试")
    
    if request.captcha.upper() != captcha_store[request.session_key]:
        del captcha_store[request.session_key]
        raise HTTPException(status_code=400, detail="验证码错误")
    
    del captcha_store[request.session_key]
    
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


@router.get("/admin-login-page")
def admin_login_page(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request})


@router.post("/admin-login", response_model=TokenResponse)
def admin_login(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.captcha or len(request.captcha) < 4:
        raise HTTPException(status_code=400, detail="请输入正确的验证码")
    
    if not request.session_key or request.session_key not in captcha_store:
        raise HTTPException(status_code=400, detail="验证码已失效，请刷新重试")
    
    if request.captcha.upper() != captcha_store[request.session_key]:
        del captcha_store[request.session_key]
        raise HTTPException(status_code=400, detail="验证码错误")
    
    del captcha_store[request.session_key]
    
    user = get_user_by_username(db, request.username)
    if not user:
        raise HTTPException(status_code=401, detail="管理员账号不存在")
    
    hashed_input_password = hash_password(request.password)
    if user.password != hashed_input_password:
        raise HTTPException(status_code=401, detail="密码错误")
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="无管理员权限")
    
    token = create_access_token({"sub": user.username, "role": user.role, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "role": user.role}


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
    if user.session_key:
        if not user.captcha or len(user.captcha) < 4:
            raise HTTPException(status_code=400, detail="请输入正确的验证码")
        
        if user.session_key not in captcha_store:
            raise HTTPException(status_code=400, detail="验证码已失效，请刷新重试")
        
        if user.captcha.upper() != captcha_store[user.session_key]:
            del captcha_store[user.session_key]
            raise HTTPException(status_code=400, detail="验证码错误")
        
        del captcha_store[user.session_key]
    
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在，请更换用户名")
    return create_user(db, user)


@router.post("/admin-create-user", response_model=UserResponse)
def admin_create_user(user: AdminUserCreate, db: Session = Depends(get_db)):
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
