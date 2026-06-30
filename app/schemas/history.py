from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TitlesSchema(BaseModel):
    objective: str
    dataHighlight: str
    lightweight: str


class QualitySchema(BaseModel):
    coverageRate: int
    titleDeviation: int
    hallucinationCount: int


class HistoryCreate(BaseModel):
    content: str
    summary: str
    titles: TitlesSchema
    quality: Optional[QualitySchema] = None


class HistoryResponse(BaseModel):
    id: int
    user_id: int
    content: str
    summary: str
    titles: TitlesSchema
    quality: Optional[QualitySchema] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    items: list[HistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int