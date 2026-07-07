from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from .database import get_session
from .logger import logger
from .models import SystemConfig


def extract_text_from_file(file: UploadFile) -> str:
    filename = file.filename or ""
    
    if filename.endswith(".txt"):
        return file.file.read().decode("utf-8", errors="replace")
    
    if filename.endswith(".md"):
        return file.file.read().decode("utf-8", errors="replace")
    
    if filename.endswith(".docx"):
        try:
            import zipfile
            from xml.etree.ElementTree import XML
            
            with zipfile.ZipFile(file.file) as docx:
                xml_content = docx.read("word/document.xml")
            
            root = XML(xml_content)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = root.findall(".//w:p", ns)
            
            text_parts = []
            for paragraph in paragraphs:
                texts = paragraph.findall(".//w:t", ns)
                for text in texts:
                    if text.text:
                        text_parts.append(text.text)
                text_parts.append("\n")
            
            return "".join(text_parts)
        except Exception as e:
            logger.error("Failed to parse docx: %s", e)
            return f"无法解析DOCX文件: {str(e)}"
    
    return f"不支持的文件格式: {filename}"

router = APIRouter(prefix="/api", tags=["AI Proxy"])


class ProcessRequest(BaseModel):
    model: str = Field(..., description="AI模型名称")
    messages: list[dict[str, str]] = Field(..., description="消息列表")
    temperature: float = Field(0.7, description="温度参数")
    max_tokens: int = Field(2000, description="最大token数")


class ProcessResponse(BaseModel):
    choices: list[dict[str, Any]]
    usage: dict[str, int]


from .config import settings

MODEL_CONFIGS = {
    "DeepSeek": {
        "url": settings.DEEPSEEK_API_URL,
        "default_key": settings.DEEPSEEK_API_KEY,
        "model_name": settings.DEEPSEEK_MODEL_NAME,
    },
    "豆包": {
        "url": f"{settings.DOUBAO_API_URL}/chat/completions",
        "default_key": settings.DOUBAO_API_KEY,
        "model_name": settings.DOUBAO_MODEL_NAME,
    },
    "文心一言": {
        "url": settings.ERNIE_API_URL,
        "default_key": settings.ERNIE_API_KEY,
        "model_name": settings.ERNIE_MODEL_NAME,
    },
    "Kimi": {
        "url": settings.KIMI_API_URL,
        "default_key": settings.KIMI_API_KEY,
        "model_name": settings.KIMI_MODEL_NAME,
    },
    "千问": {
        "url": settings.QWEN_API_URL,
        "default_key": settings.QWEN_API_KEY,
        "model_name": settings.QWEN_MODEL_NAME,
    },
}

ARK_CONFIG = {
    "base_url": settings.DOUBAO_API_URL,
    "default_api_key": settings.DOUBAO_API_KEY,
    "model_name": settings.DOUBAO_MODEL_NAME,
}

MAX_VIDEO_FILE_SIZE = 512 * 1024 * 1024
MAX_VIDEO_URL_SIZE = 50 * 1024 * 1024

ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"]


def extract_video_summary_text(result: dict) -> str:
    try:
        choices = result.get("choices")
        if choices and isinstance(choices, list) and len(choices) > 0:
            message = choices[0].get("message")
            if message:
                content = message.get("content")
                if isinstance(content, str):
                    return content
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict):
                            if item.get("type") == "text":
                                return item.get("text", "")
                            elif item.get("type") == "output_text":
                                return item.get("text", "")
        
        output = result.get("output", [])
        if isinstance(output, list) and len(output) > 0:
            for item in output:
                if item.get("type") == "message" and item.get("role") == "assistant":
                    content = item.get("content", [])
                    if isinstance(content, str):
                        return content
                    elif isinstance(content, list):
                        for content_item in content:
                            if isinstance(content_item, dict):
                                if content_item.get("type") == "output_text":
                                    return content_item.get("text", "")
                                elif content_item.get("type") == "text":
                                    return content_item.get("text", "")
            for item in output:
                summary = item.get("summary", [])
                if isinstance(summary, list):
                    for summary_item in summary:
                        if isinstance(summary_item, dict) and summary_item.get("type") == "summary_text":
                            return summary_item.get("text", "")
        
        return result.get("output_text", "")
    except Exception as e:
        logger.error("Failed to extract video summary text: %s", e)
        return result.get("output_text", "")


class ProcessRequestWithConfig(ProcessRequest):
    api_key: Optional[str] = Field(None, description="API密钥")
    api_url: Optional[str] = Field(None, description="API地址")


class QualityCheckRequest(BaseModel):
    content: str = Field(..., description="原文内容")
    summary: str = Field(..., description="摘要")
    titles: dict[str, str] = Field(..., description="标题字典")


class QualityCheckResponse(BaseModel):
    credibility: int = Field(..., description="新闻可信度")
    readability: int = Field(..., description="内容可读性")
    engagement: int = Field(..., description="读者吸引力")
    relevance: int = Field(..., description="主题相关性")


def calculate_text_quality(content: str, summary: str, titles: dict[str, str]) -> dict[str, int]:
    credibility = 75
    readability = 75
    engagement = 75
    relevance = 75

    content_length = len(content.strip())
    summary_length = len(summary.strip())

    if content_length < 100:
        credibility -= 20
    elif content_length < 500:
        credibility -= 10
    elif content_length > 5000:
        credibility += 10
    elif content_length > 2000:
        credibility += 5

    if summary_length < 50:
        readability -= 15
    elif summary_length < 100:
        readability -= 5
    elif summary_length > 500:
        readability -= 10
    elif summary_length > 300:
        readability -= 5

    content_sentences = content.count('。') + content.count('！') + content.count('？') + content.count('.') + content.count('!') + content.count('?')
    if content_sentences > 0:
        avg_sentence_length = content_length / content_sentences
        if avg_sentence_length < 10:
            readability += 10
        elif avg_sentence_length < 20:
            readability += 5
        elif avg_sentence_length > 60:
            readability -= 15
        elif avg_sentence_length > 40:
            readability -= 5

    unique_words = len(set(content.replace(' ', '').replace('　', '')))
    if unique_words > content_length * 0.5:
        readability += 10
    elif unique_words < content_length * 0.1:
        readability -= 10

    title_lengths = [len(t) for t in titles.values()]
    avg_title_length = sum(title_lengths) / len(title_lengths) if title_lengths else 0

    if avg_title_length >= 10 and avg_title_length <= 30:
        engagement += 15
    elif avg_title_length < 8:
        engagement -= 10
    elif avg_title_length > 35:
        engagement -= 5

    for title in titles.values():
        if any(kw in title for kw in ['震惊', '竟然', '秘密', '真相', '终于', '曝光', '必看', '不看后悔']):
            engagement -= 15
            credibility -= 10
            break

    for title in titles.values():
        if any(kw in title for kw in ['数据', '分析', '研究', '报告', '调查']):
            engagement += 10
            credibility += 10
            break

    content_lower = content.lower()
    summary_lower = summary.lower()
    
    content_keywords = set(re.findall(r'[\u4e00-\u9fa5]{2,}', content_lower))
    summary_keywords = set(re.findall(r'[\u4e00-\u9fa5]{2,}', summary_lower))
    
    if content_keywords and summary_keywords:
        overlap = len(content_keywords & summary_keywords)
        total = len(content_keywords | summary_keywords)
        if total > 0:
            similarity = overlap / total
            relevance = min(100, int(relevance + similarity * 30))
            if similarity < 0.2:
                relevance -= 20
            elif similarity < 0.5:
                relevance -= 10

    for title in titles.values():
        title_keywords = set(re.findall(r'[\u4e00-\u9fa5]{2,}', title.lower()))
        if content_keywords and title_keywords:
            title_overlap = len(content_keywords & title_keywords)
            title_total = len(content_keywords | title_keywords)
            if title_total > 0:
                title_similarity = title_overlap / title_total
                if title_similarity > 0.3:
                    relevance += 10
                elif title_similarity < 0.1:
                    relevance -= 15

    if summary_length > 0 and content_length > 0:
        coverage_ratio = summary_length / content_length
        if coverage_ratio >= 0.2 and coverage_ratio <= 0.6:
            relevance += 10
        elif coverage_ratio < 0.1:
            relevance -= 15
        elif coverage_ratio > 0.8:
            relevance -= 5

    if '来源' in content or '作者' in content:
        credibility += 15
    if '版权' in content or '原创' in content:
        credibility += 10

    return {
        "credibility": max(0, min(100, credibility)),
        "readability": max(0, min(100, readability)),
        "engagement": max(0, min(100, engagement)),
        "relevance": max(0, min(100, relevance)),
    }


@router.post("/quality-check", response_model=QualityCheckResponse)
async def quality_check(req: QualityCheckRequest):
    try:
        result = calculate_text_quality(req.content, req.summary, req.titles)
        return result
    except Exception as e:
        logger.error("Quality check failed: %s", e)
        return {
            "credibility": 75,
            "readability": 75,
            "engagement": 75,
            "relevance": 75,
        }


def get_api_key_from_db(db: Session, model_name: str) -> str:
    config_key = f"api_key_{model_name.lower().replace(' ', '_')}"
    config = db.exec(select(SystemConfig).where(SystemConfig.key == config_key)).first()
    if config and config.value:
        return config.value
    config = db.exec(select(SystemConfig).where(SystemConfig.key == "default_api_key")).first()
    if config and config.value:
        return config.value
    return ""


@router.post("/process")
async def process_ai_request(
    request: Request,
    req: ProcessRequestWithConfig,
    db: Session = Depends(get_session),
):
    config = MODEL_CONFIGS.get(req.model)
    if not config:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {req.model}")

    target_url = config["url"] if not req.api_url or req.api_url == '/api/process' else req.api_url
    
    db_api_key = get_api_key_from_db(db, req.model)
    target_api_key = req.api_key if req.api_key else (db_api_key if db_api_key else config["default_key"])
    target_model = config["model_name"]

    if not target_api_key:
        raise HTTPException(status_code=400, detail="请在设置中心配置API密钥")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            payload = {
                "model": target_model,
                "messages": req.messages,
                "temperature": req.temperature,
                "max_tokens": req.max_tokens,
            }

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {target_api_key}",
            }

            response = await client.post(target_url, json=payload, headers=headers)

            if not response.is_success:
                logger.warning("AI API request failed: %s %s", response.status_code, response.text)
                raise HTTPException(status_code=response.status_code, detail=f"API调用失败: {response.text[:200]}")

            result = response.json()
            return result

    except httpx.RequestError as e:
        logger.error("AI API request error: %s", e)
        raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error("AI API response parse error: %s", e)
        raise HTTPException(status_code=500, detail="API响应解析失败")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        text_content = extract_text_from_file(file)
        return {
            "code": 0,
            "message": "文件解析成功",
            "data": {
                "filename": file.filename,
                "content": text_content,
                "length": len(text_content),
            },
        }
    except Exception as e:
        logger.error("File upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


class TestRequest(BaseModel):
    content: str = Field(..., description="测试内容")
    summaryType: str = Field("标准摘要", description="摘要类型")
    language: str = Field("中文", description="语言")
    model: str = Field(..., description="AI模型名称")


@router.post("/test-api")
async def test_api_connection(req: TestRequest, api_key: Optional[str] = None, api_url: Optional[str] = None, db: Session = Depends(get_session)):
    config = MODEL_CONFIGS.get(req.model)
    if not config:
        return {"success": False, "message": f"不支持的模型: {req.model}"}

    target_url = api_url or config["url"]
    
    db_api_key = get_api_key_from_db(db, req.model)
    target_api_key = api_key if api_key else (db_api_key if db_api_key else config["default_key"])

    if not target_api_key:
        return {"success": False, "message": "请先配置API密钥"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {
                "model": config["model_name"],
                "messages": [{"role": "user", "content": "测试连接"}],
                "temperature": 0.7,
                "max_tokens": 50,
            }

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {target_api_key}",
            }

            response = await client.post(target_url, json=payload, headers=headers)

            if response.is_success:
                return {"success": True, "message": f"API连接成功，状态码: {response.status_code}"}
            else:
                return {"success": False, "message": f"连接失败: {response.status_code} {response.text[:200]}"}

    except httpx.RequestError as e:
        return {"success": False, "message": f"连接失败: {str(e)}"}


class VideoUploadRequest(BaseModel):
    fps: float = Field(0.3, description="抽帧频率（0.3~3帧/秒）")
    api_key: Optional[str] = Field(None, description="火山方舟API密钥")


@router.post("/video/upload")
async def upload_video_file(
    file: UploadFile = File(...),
    fps: float = 0.3,
    api_key: Optional[str] = None,
):
    filename = file.filename or ""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if not ext or f".{ext}" not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的视频格式，仅支持: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    file_size = 0
    content = b""
    chunk_size = 4 * 1024 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        content += chunk
        file_size += len(chunk)
        if file_size > MAX_VIDEO_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制（最大512MB），当前文件大小: {file_size / (1024 * 1024):.2f}MB"
            )

    api_key = api_key or ARK_CONFIG["default_api_key"]
    if not api_key:
        raise HTTPException(status_code=400, detail="请配置火山方舟API密钥")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            upload_url = f"{ARK_CONFIG['base_url']}/files"
            headers = {
                "Authorization": f"Bearer {api_key}",
            }

            form_data = {
                "purpose": "user_data",
                "preprocess_configs": json.dumps({
                    "video": {"fps": fps}
                }),
            }

            files = {
                "file": (filename, content, "video/mp4"),
            }

            response = await client.post(
                upload_url,
                headers=headers,
                data=form_data,
                files=files,
            )

            if not response.is_success:
                logger.error("Video upload failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"视频上传失败: {response.text[:200]}"
                )

            result = response.json()
            file_id = result.get("id")

            if not file_id:
                raise HTTPException(status_code=500, detail="文件上传成功但未返回file_id")

            return {
                "success": True,
                "message": "视频上传成功",
                "file_id": file_id,
                "filename": filename,
                "size": file_size,
            }

    except httpx.RequestError as e:
        logger.error("Video upload request error: %s", e)
        raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")


class VideoFileStatusRequest(BaseModel):
    file_id: str = Field(..., description="上传文件返回的file_id")
    api_key: Optional[str] = Field(None, description="火山方舟API密钥")


@router.post("/video/check-status")
async def check_video_status(req: VideoFileStatusRequest):
    api_key = req.api_key or ARK_CONFIG["default_api_key"]
    if not api_key:
        raise HTTPException(status_code=400, detail="请配置火山方舟API密钥")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            status_url = f"{ARK_CONFIG['base_url']}/files/{req.file_id}"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            response = await client.get(status_url, headers=headers)

            if not response.is_success:
                logger.error("Video status check failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"状态检查失败: {response.text[:200]}"
                )

            result = response.json()
            return {
                "success": True,
                "file_id": req.file_id,
                "status": result.get("status", "unknown"),
                "result": result,
            }

    except httpx.RequestError as e:
        logger.error("Video status check error: %s", e)
        raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")


class VideoSummaryRequest(BaseModel):
    file_id: Optional[str] = Field(None, description="上传文件的file_id")
    video_url: Optional[str] = Field(None, description="视频URL地址")
    fps: float = Field(0.3, description="抽帧频率")
    api_key: Optional[str] = Field(None, description="火山方舟API密钥")
    prompt: str = Field("完整分析视频，提取对话字幕，输出结构化摘要", description="提示词")


@router.post("/video/summary")
async def generate_video_summary(req: VideoSummaryRequest):
    if not req.file_id and not req.video_url:
        raise HTTPException(status_code=400, detail="请提供file_id或video_url")

    api_key = req.api_key or ARK_CONFIG["default_api_key"]
    if not api_key:
        raise HTTPException(status_code=400, detail="请配置火山方舟API密钥")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            summary_url = f"{ARK_CONFIG['base_url']}/responses"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            video_content: dict = {}
            if req.file_id:
                video_content = {
                    "type": "input_video",
                    "file_id": req.file_id,
                }
            elif req.video_url:
                video_content = {
                    "type": "input_video",
                    "video_url": req.video_url,
                    "fps": req.fps,
                }

            payload = {
                "model": ARK_CONFIG["model_name"],
                "input": [{
                    "role": "user",
                    "content": [
                        video_content,
                        {"type": "input_text", "text": req.prompt},
                    ],
                }],
            }

            logger.info("Calling ARK API for video summary: %s", summary_url)
            logger.info("ARK API payload: %s", json.dumps(payload, indent=2, ensure_ascii=False))
            
            response = await client.post(summary_url, json=payload, headers=headers)

            if not response.is_success:
                logger.error("Video summary failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"视频摘要生成失败: {response.text[:200]}"
                )

            result = response.json()
            logger.info("ARK API response for video summary: %s", json.dumps(result, indent=2, ensure_ascii=False))
            output_text = extract_video_summary_text(result)
            logger.info("Extracted video summary text: %s", output_text[:500] if output_text else "EMPTY")

            return {
                "success": True,
                "message": "视频摘要生成成功",
                "summary": output_text,
                "result": result,
            }

    except httpx.RequestError as e:
        logger.error("Video summary request error: %s", e)
        raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")


class VideoProcessRequest(BaseModel):
    video_url: Optional[str] = Field(None, description="视频URL地址")
    fps: float = Field(0.3, description="抽帧频率")
    api_key: Optional[str] = Field(None, description="火山方舟API密钥")


async def extract_video_from_webpage(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            if not response.is_success:
                logger.error("Failed to fetch webpage: %s", response.status_code)
                return {"success": False, "error": f"无法获取网页内容，HTTP状态码: {response.status_code}"}

            content = response.text
            soup = BeautifulSoup(content, "html.parser")

            page_text = ""
            title_tag = soup.find("title")
            if title_tag:
                page_text += title_tag.get_text(strip=True) + "\n\n"

            meta_description = soup.find("meta", attrs={"name": "description"})
            if meta_description and meta_description.get("content"):
                page_text += meta_description["content"] + "\n\n"

            for tag in soup.find_all(["p", "article", "div"]):
                tag_text = tag.get_text(strip=True)
                if len(tag_text) > 50:
                    page_text += tag_text + "\n\n"

            video_url = None
            video_extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".ts"]

            def normalize_video_url(src: str) -> str:
                if src.startswith("//"):
                    return "https:" + src
                elif src.startswith("/"):
                    parsed = httpx.URL(url)
                    return f"{parsed.scheme}://{parsed.host}{src}"
                elif src.startswith("http"):
                    return src
                return ""

            logger.info("Starting video extraction from: %s", url)

            for video in soup.find_all("video"):
                source = video.find("source")
                if source and source.get("src"):
                    src = source["src"]
                    if any(ext in src.lower() for ext in video_extensions):
                        video_url = normalize_video_url(src)
                        logger.info("Found video via <video> tag: %s", video_url)
                        break
                if not video_url and video.get("src"):
                    src = video["src"]
                    if any(ext in src.lower() for ext in video_extensions):
                        video_url = normalize_video_url(src)
                        logger.info("Found video via video src attribute: %s", video_url)
                        break

            if not video_url:
                for source in soup.find_all("source"):
                    if source.get("src"):
                        src = source["src"]
                        if any(ext in src.lower() for ext in video_extensions):
                            video_url = normalize_video_url(src)
                            logger.info("Found video via <source> tag: %s", video_url)
                            break

            if not video_url:
                for iframe in soup.find_all("iframe"):
                    if iframe.get("src"):
                        iframe_src = iframe["src"]
                        iframe_src = normalize_video_url(iframe_src)
                        if "video" in iframe_src.lower() or "player" in iframe_src.lower() or "v.qq" in iframe_src.lower() or "youku" in iframe_src.lower():
                            try:
                                iframe_response = await client.get(iframe_src, follow_redirects=True)
                                iframe_soup = BeautifulSoup(iframe_response.text, "html.parser")
                                for v in iframe_soup.find_all("video"):
                                    source = v.find("source")
                                    if source and source.get("src"):
                                        src = source["src"]
                                        if any(ext in src.lower() for ext in video_extensions):
                                            video_url = normalize_video_url(src)
                                            logger.info("Found video via iframe: %s", video_url)
                                            break
                                if video_url:
                                    break
                            except Exception as e:
                                logger.warning("Failed to parse iframe: %s", e)

            if not video_url:
                for script in soup.find_all("script"):
                    script_content = script.string or ""
                    for ext in video_extensions:
                        if ext in script_content.lower():
                            patterns = [
                                r'["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']',
                                r'url\s*[:=]\s*["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']',
                                r'src\s*[:=]\s*["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']',
                                r'videoUrl\s*[:=]\s*["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']',
                                r'video_url\s*[:=]\s*["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']',
                            ]
                            for pattern in patterns:
                                match = re.search(pattern, script_content)
                                if match:
                                    src = match.group(1)
                                    video_url = normalize_video_url(src)
                                    if video_url:
                                        logger.info("Found video via script regex: %s", video_url)
                                        break
                            if video_url:
                                break
                    if video_url:
                        break

            if not video_url:
                cctv_match = re.search(r'VIDE(\w+)\.shtml', url)
                if cctv_match and "cctv" in url.lower():
                    cctv_video_id = cctv_match.group(1)
                    video_url = f"https://v.cctv.com/2019/06/03/VIDE{cctv_video_id}.mp4"
                    logger.info("Generated CCTV video URL: %s", video_url)

            if not video_url:
                chinanews_match = re.search(r'/shipin/(cns-d|cms-d)/\d{4}/\d{2}-\d{2}/news(\d+)\.shtml', url)
                if chinanews_match and "chinanews" in url.lower():
                    video_id = chinanews_match.group(2)
                    video_url = f"https://flvmp4.chinanews.com/video/{video_id}.mp4"
                    logger.info("Generated chinanews video URL: %s", video_url)

            if not video_url:
                patterns = [
                    r'["\'](https?://[^"\']+\.(?:mp4|mov|avi|mkv|webm|flv|ts))["\']',
                    r'url\s*[:=]\s*["\'](https?://[^"\']+\.(?:mp4|mov|avi|mkv|webm|flv|ts))["\']',
                    r'src\s*[:=]\s*["\'](https?://[^"\']+\.(?:mp4|mov|avi|mkv|webm|flv|ts))["\']',
                ]
                for pattern in patterns:
                    match = re.search(pattern, content)
                    if match:
                        video_url = match.group(1)
                        logger.info("Found video via content regex: %s", video_url)
                        break

            if video_url:
                try:
                    test_response = await client.head(video_url, timeout=10.0, follow_redirects=True)
                    if test_response.status_code not in [200, 206]:
                        logger.warning("Video URL validation failed: %s - %s", video_url, test_response.status_code)
                        video_url = None
                except Exception as e:
                    logger.warning("Failed to validate video URL: %s", e)

            return {
                "success": True,
                "video_url": video_url,
                "page_text": page_text.strip(),
                "url": url,
            }

    except Exception as e:
        logger.error("Extract video from webpage failed: %s", e)
        return {"success": False, "error": str(e)}


def fix_chinanews_url(url: str) -> str:
    if "chinanews.com.cn" in url:
        url = url.replace("/cms-d/", "/cns-d/")
        url = url.replace("/news/", "/")
        pattern = r'(chinanews\.com\.cn/[^/]+/shipin/cns-d/\d{4}/\d{2}-\d{2}/)(\d+)\.shtml'
        match = re.search(pattern, url)
        if match:
            url = f"{match.group(1)}news{match.group(2)}.shtml"
    return url


@router.post("/video/process-url")
async def process_video_url(req: VideoProcessRequest):
    if not req.video_url:
        raise HTTPException(status_code=400, detail="请提供视频URL")

    api_key = req.api_key or ARK_CONFIG["default_api_key"]
    if not api_key:
        raise HTTPException(status_code=400, detail="请配置火山方舟API密钥")

    video_extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".ts"]
    is_direct_video = any(ext in req.video_url.lower() for ext in video_extensions)

    page_text = ""
    actual_video_url = req.video_url

    if not is_direct_video:
        processed_url = req.video_url
        if "chinanews.com.cn" in req.video_url:
            processed_url = fix_chinanews_url(req.video_url)
            if processed_url != req.video_url:
                logger.info("Fixed chinanews URL: %s -> %s", req.video_url, processed_url)

        logger.info("Processing webpage URL: %s", processed_url)
        extract_result = await extract_video_from_webpage(processed_url)
        
        if not extract_result["success"]:
            if "404" in extract_result.get("error", ""):
                if processed_url != req.video_url:
                    raise HTTPException(status_code=400, detail=f"网页无法访问（404），已尝试修正URL但仍无法访问。请检查URL是否正确。")
                raise HTTPException(status_code=400, detail=f"网页无法访问（404），请检查URL是否正确。正确格式示例：https://www.chinanews.com.cn/cj/shipin/cns-d/2026/07-02/news1060215.shtml")
            raise HTTPException(status_code=400, detail=extract_result.get("error", "无法提取视频"))

        page_text = extract_result.get("page_text", "")
        actual_video_url = extract_result.get("video_url")

        if not actual_video_url:
            raise HTTPException(status_code=400, detail="网页中未找到视频。请确保输入的URL是包含视频的新闻页面，或直接输入视频文件链接（.mp4等）")

        logger.info("Extracted video URL: %s", actual_video_url)

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            summary_url = f"{ARK_CONFIG['base_url']}/responses"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            text_prompt = "完整分析视频内容，提取对话字幕和画面关键信息，输出结构化视频摘要，包括：1.关键事件时间线 2.主要人物 3.核心观点 4.重要台词"
            if page_text:
                text_prompt = f"网页文字内容参考：\n{page_text[:2000]}\n\n基于以上网页内容和视频，完整分析视频内容，提取对话字幕和画面关键信息，输出结构化视频摘要，包括：1.关键事件时间线 2.主要人物 3.核心观点 4.重要台词"

            payload = {
                "model": ARK_CONFIG["model_name"],
                "input": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "input_video",
                            "video_url": actual_video_url,
                            "fps": req.fps,
                        },
                        {
                            "type": "input_text",
                            "text": text_prompt,
                        },
                    ],
                }],
            }

            logger.info("Calling ARK API: %s", summary_url)
            logger.info("ARK API payload: %s", json.dumps(payload, indent=2, ensure_ascii=False))
            
            response = await client.post(summary_url, json=payload, headers=headers)

            if not response.is_success:
                logger.error("Video URL process failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"视频处理失败: {response.text[:200]}"
                )

            result = response.json()
            logger.info("ARK API response: %s", json.dumps(result, indent=2, ensure_ascii=False))
            output_text = extract_video_summary_text(result)
            logger.info("Extracted video summary text: %s", output_text[:500] if output_text else "EMPTY")

            final_content = output_text
            if page_text:
                final_content = f"网页文字内容：\n{page_text[:3000]}\n\n---视频摘要---\n\n{output_text}"

            return {
                "success": True,
                "message": "视频处理成功",
                "content": final_content,
                "video_url": actual_video_url,
                "source_url": req.video_url,
                "has_page_text": len(page_text) > 0,
            }

    except httpx.RequestError as e:
        logger.error("Video URL process error: %s", e)
        raise HTTPException(status_code=500, detail=f"网络连接失败: {str(e)}")