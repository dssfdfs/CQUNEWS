from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NewsArticleCreate(BaseModel):
    url: str
    url_hash: str
    title: str
    content: str
    source_id: Optional[int] = None
    summary: str = None
    summary_short: str = None
    summary_medium: str = None
    summary_long: str = None
    sentiment_score: float = 0.0
    sentiment_label: str = "neutral"
    score: float = 0.0
    kept: bool = True
    published_at: datetime = None


class NewsArticleResponse(BaseModel):
    id: int
    url: str
    title: str
    content: str
    summary: Optional[str]
    summary_short: Optional[str]
    summary_medium: Optional[str]
    summary_long: Optional[str]
    sentiment_score: float
    sentiment_label: str
    source_id: int
    score: float
    kept: bool
    published_at: Optional[datetime]

    class Config:
        orm_mode = True


class ArticleIngestRequest(BaseModel):
    url: str


class SummaryGenerateRequest(BaseModel):
    content: str
    title: str = None
    length: str = "medium"
    style: str = "neutral"


class TitleGenerateRequest(BaseModel):
    content: str
    style: str = "neutral"


class SummaryGenerateResponse(BaseModel):
    summary_short: str
    summary_medium: str
    summary_long: str
    selected_summary: str
    generated_title: str = None
    sentiment_label: str = None
    emotion_label_cn: str = None
    sentiment_score: float = None
    primary_category: str = None
    category_confidence: float = None


class TitleGenerateResponse(BaseModel):
    title: str


class SentimentAnalysisResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    emotion_label: str
    emotion_label_cn: str
    emotion_scores: dict
    positive_words: list
    negative_words: list


class NewsCategoryResponse(BaseModel):
    primary_category: str
    confidence: float
    category_scores: dict
    top_categories: list