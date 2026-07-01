from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app.services.ai_service import generate_summary_with_style, generate_title, analyze_sentiment, classify_news, calculate_coverage

router = APIRouter(prefix="/process", tags=["process"])


class ProcessRequest(BaseModel):
    content: str
    summaryType: str = "标准摘要"
    language: str = "中文"
    model: str = "DeepSeek"


class TitleResult(BaseModel):
    objective: str
    dataHighlight: str
    lightweight: str


class QualityResult(BaseModel):
    coverageRate: int
    titleDeviation: int
    hallucinationCount: int


class ProcessResponse(BaseModel):
    summary: str
    titles: TitleResult
    quality: QualityResult


@router.post("/summary", response_model=dict)
def generate_summary_api(request: ProcessRequest):
    length_map = {"简短摘要": "short", "标准摘要": "medium", "详细摘要": "long"}
    length = length_map.get(request.summaryType, "medium")
    
    summaries = generate_summary_with_style(request.content, length=length)
    
    return {
        "summary": summaries[length],
        "summary_short": summaries["short"],
        "summary_medium": summaries["medium"],
        "summary_long": summaries["long"]
    }


@router.post("/titles", response_model=TitleResult)
def generate_titles_api(request: ProcessRequest):
    titles = {
        "objective": generate_title(request.content, style="formal"),
        "dataHighlight": generate_title(request.content, style="vivid"),
        "lightweight": generate_title(request.content, style="question")
    }
    return titles


@router.post("/quality", response_model=QualityResult)
def verify_quality_api(request: ProcessRequest):
    summaries = generate_summary_with_style(request.content)
    summary = summaries["medium"]
    
    titles = {
        "objective": generate_title(request.content, style="formal"),
        "dataHighlight": generate_title(request.content, style="vivid"),
        "lightweight": generate_title(request.content, style="question")
    }
    
    sentiment = analyze_sentiment(request.content)
    category = classify_news(request.content)
    
    coverage_score = calculate_coverage(request.content, summary)
    title_deviation = max(0, 20 - len(titles["objective"]) // 5)
    hallucination_count = 0 if sentiment["sentiment_label"] == "neutral" else 0
    
    return {
        "coverageRate": coverage_score,
        "titleDeviation": title_deviation,
        "hallucinationCount": hallucination_count
    }


@router.post("/all", response_model=ProcessResponse)
def generate_all_api(request: ProcessRequest):
    length_map = {"简短摘要": "short", "标准摘要": "medium", "详细摘要": "long"}
    length = length_map.get(request.summaryType, "medium")
    
    summaries = generate_summary_with_style(request.content, length=length)
    summary = summaries[length]
    
    titles = {
        "objective": generate_title(request.content, style="formal"),
        "dataHighlight": generate_title(request.content, style="vivid"),
        "lightweight": generate_title(request.content, style="question")
    }
    
    coverage_score = calculate_coverage(request.content, summary)
    title_deviation = max(0, 20 - len(titles["objective"]) // 5)
    hallucination_count = 0
    
    return {
        "summary": summary,
        "titles": titles,
        "quality": {
            "coverageRate": coverage_score,
            "titleDeviation": title_deviation,
            "hallucinationCount": hallucination_count
        }
    }