from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.models.history_task import HistoryTask

router = APIRouter(prefix="/history", tags=["history"])


class HistoryCreate(BaseModel):
    content: str
    summary: str
    titles: dict
    quality: dict
    user_id: Optional[int] = None


class HistoryResponse(BaseModel):
    id: int
    content: str
    summary: str
    titles: dict
    quality: dict
    status: str
    category: str
    createdAt: datetime

    model_config = {"from_attributes": True}


def classify_news(content: str) -> str:
    category_keywords = {
        '科技': ['人工智能', 'AI', '科技', '技术', '互联网', '数据', '算法', '软件', '硬件', '计算机', '网络', '信息'],
        '财经': ['经济', '股票', '金融', '投资', '公司', '企业', '市场', '财报', '银行', '贸易', '消费', 'GDP'],
        '国际': ['国际', '海外', '全球', '世界', '各国', '贸易', '外交', '政策', '合作'],
        '教育': ['教育', '学校', '学生', '老师', '课程', '考试', '学习', '大学', '培训'],
        '娱乐': ['娱乐', '电影', '音乐', '明星', '综艺', '演出', '电视剧'],
        '体育': ['体育', '比赛', '足球', '篮球', '运动', '冠军', '联赛'],
    }
    
    for category, keywords in category_keywords.items():
        if any(kw in content for kw in keywords):
            return category
    return '其他'


def create_history_task(db: Session, task: HistoryCreate):
    category = classify_news(task.content)
    
    db_task = HistoryTask(
        user_id=task.user_id,
        content=task.content,
        summary=task.summary,
        objective_title=task.titles.get("objective", ""),
        data_highlight_title=task.titles.get("dataHighlight", ""),
        lightweight_title=task.titles.get("lightweight", ""),
        coverage_rate=task.quality.get("coverageRate", 0),
        title_deviation=task.quality.get("titleDeviation", 0),
        hallucination_count=task.quality.get("hallucinationCount", 0),
        status="已完成" if task.summary and task.titles.get("objective") else "待处理",
        category=category
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_history_tasks(
    db: Session, 
    user_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 10,
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    query = db.query(HistoryTask)
    
    if user_id:
        query = query.filter(HistoryTask.user_id == user_id)
    
    if keyword:
        query = query.filter(
            HistoryTask.content.contains(keyword) | 
            HistoryTask.summary.contains(keyword) |
            HistoryTask.objective_title.contains(keyword)
        )
    
    if status and status != "全部状态":
        query = query.filter(HistoryTask.status == status)
    
    if start_date:
        query = query.filter(HistoryTask.created_at >= start_date)
    
    if end_date:
        query = query.filter(HistoryTask.created_at <= end_date)
    
    total = query.count()
    tasks = query.order_by(HistoryTask.created_at.desc()).offset(skip).limit(limit).all()
    
    return tasks, total


def get_history_task(db: Session, task_id: int, user_id: Optional[int] = None):
    query = db.query(HistoryTask).filter(HistoryTask.id == task_id)
    if user_id:
        query = query.filter(HistoryTask.user_id == user_id)
    return query.first()


def delete_history_task(db: Session, task_id: int, user_id: Optional[int] = None):
    query = db.query(HistoryTask).filter(HistoryTask.id == task_id)
    if user_id:
        query = query.filter(HistoryTask.user_id == user_id)
    task = query.first()
    if task:
        db.delete(task)
        db.commit()
    return task


def update_history_task(db: Session, task_id: int, task: HistoryCreate, user_id: Optional[int] = None):
    query = db.query(HistoryTask).filter(HistoryTask.id == task_id)
    if user_id:
        query = query.filter(HistoryTask.user_id == user_id)
    db_task = query.first()
    
    if not db_task:
        return None
    
    db_task.content = task.content
    db_task.summary = task.summary
    db_task.objective_title = task.titles.get("objective", "")
    db_task.data_highlight_title = task.titles.get("dataHighlight", "")
    db_task.lightweight_title = task.titles.get("lightweight", "")
    db_task.coverage_rate = task.quality.get("coverageRate", 0)
    db_task.title_deviation = task.quality.get("titleDeviation", 0)
    db_task.hallucination_count = task.quality.get("hallucinationCount", 0)
    db_task.status = "已完成" if task.summary and task.titles.get("objective") else "待处理"
    db_task.category = classify_news(task.content)
    
    db.commit()
    db.refresh(db_task)
    return db_task


def format_history_response(task: HistoryTask) -> dict:
    return {
        "id": task.id,
        "content": task.content,
        "summary": task.summary,
        "titles": {
            "objective": task.objective_title,
            "dataHighlight": task.data_highlight_title,
            "lightweight": task.lightweight_title
        },
        "quality": {
            "coverageRate": task.coverage_rate,
            "titleDeviation": task.title_deviation,
            "hallucinationCount": task.hallucination_count
        },
        "status": task.status,
        "category": task.category,
        "createdAt": task.created_at
    }


@router.post("/", response_model=HistoryResponse)
def add_history(task: HistoryCreate, db: Session = Depends(get_db)):
    if not task.user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    db_task = create_history_task(db, task)
    return format_history_response(db_task)


@router.get("/", response_model=dict)
def get_history(
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    limit = page_size
    
    start_date_dt = datetime.fromisoformat(start_date) if start_date else None
    end_date_dt = datetime.fromisoformat(end_date + 'T23:59:59') if end_date else None
    
    tasks, total = get_history_tasks(
        db, 
        user_id=user_id, 
        skip=skip, 
        limit=limit,
        keyword=keyword,
        status=status,
        start_date=start_date_dt,
        end_date=end_date_dt
    )
    
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "data": [format_history_response(task) for task in tasks],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/{task_id}", response_model=HistoryResponse)
def get_history_item(task_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    task = get_history_task(db, task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="History not found")
    return format_history_response(task)


@router.put("/{task_id}", response_model=HistoryResponse)
def update_history(task_id: int, task: HistoryCreate, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    db_task = update_history_task(db, task_id, task, user_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="History not found")
    return format_history_response(db_task)


@router.delete("/{task_id}")
def delete_history(task_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    task = delete_history_task(db, task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="History not found")
    return {"message": "Deleted successfully"}