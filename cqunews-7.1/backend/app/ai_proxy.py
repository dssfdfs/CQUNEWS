from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from .logger import logger


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


MODEL_CONFIGS = {
    "DeepSeek": {
        "url": "https://api.deepseek.com/chat/completions",
        "default_key": "",
        "model_name": "deepseek-v4-flash",
    },
    "豆包": {
        "url": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        "default_key": "ark-4ab1a329-a619-4ec4-a020-d62e32193c08-65a68",
        "model_name": "ep-20260702173631-5c5qs",
    },
    "文心一言": {
        "url": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions",
        "default_key": "",
        "model_name": "ernie-4.0",
    },
    "Kimi": {
        "url": "https://api.moonshot.cn/v1/chat/completions",
        "default_key": "",
        "model_name": "moonshot-v1-8k",
    },
    "千问": {
        "url": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        "default_key": "",
        "model_name": "qwen-turbo",
    },
}

ARK_CONFIG = {
    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
    "default_api_key": "ark-4ab1a329-a619-4ec4-a020-d62e32193c08-65a68",
    "model_name": "ep-20260702173631-5c5qs",
}

MAX_VIDEO_FILE_SIZE = 512 * 1024 * 1024
MAX_VIDEO_URL_SIZE = 50 * 1024 * 1024

ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"]


def extract_video_summary_text(result: dict) -> str:
    try:
        output = result.get("output", [])
        for item in output:
            if item.get("type") == "message" and item.get("role") == "assistant":
                content = item.get("content", [])
                for content_item in content:
                    if content_item.get("type") == "output_text":
                        return content_item.get("text", "")
        for item in output:
            summary = item.get("summary", [])
            for summary_item in summary:
                if summary_item.get("type") == "summary_text":
                    return summary_item.get("text", "")
        return result.get("output_text", "")
    except Exception as e:
        logger.error("Failed to extract video summary text: %s", e)
        return result.get("output_text", "")


class ProcessRequestWithConfig(ProcessRequest):
    api_key: Optional[str] = Field(None, description="API密钥")
    api_url: Optional[str] = Field(None, description="API地址")


@router.post("/process")
async def process_ai_request(
    request: Request,
    req: ProcessRequestWithConfig,
):
    config = MODEL_CONFIGS.get(req.model)
    if not config:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {req.model}")

    target_url = config["url"] if not req.api_url or req.api_url == '/api/process' else req.api_url
    target_api_key = config["default_key"] if not req.api_key else req.api_key
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
async def test_api_connection(req: TestRequest, api_key: Optional[str] = None, api_url: Optional[str] = None):
    config = MODEL_CONFIGS.get(req.model)
    if not config:
        return {"success": False, "message": f"不支持的模型: {req.model}"}

    target_url = api_url or config["url"]
    target_api_key = api_key or config["default_key"]

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

            response = await client.post(summary_url, json=payload, headers=headers)

            if not response.is_success:
                logger.error("Video summary failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"视频摘要生成失败: {response.text[:200]}"
                )

            result = response.json()
            output_text = extract_video_summary_text(result)

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
                return {"success": False, "error": "无法获取网页内容"}

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
            video_extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"]

            for video in soup.find_all("video"):
                source = video.find("source")
                if source and source.get("src"):
                    src = source["src"]
                    if any(ext in src.lower() for ext in video_extensions):
                        if src.startswith("//"):
                            video_url = "https:" + src
                        elif src.startswith("/"):
                            parsed = httpx.URL(url)
                            video_url = f"{parsed.scheme}://{parsed.host}{src}"
                        else:
                            video_url = src
                        break

            if not video_url:
                for iframe in soup.find_all("iframe"):
                    if iframe.get("src"):
                        iframe_src = iframe["src"]
                        if "video" in iframe_src.lower() or "player" in iframe_src.lower():
                            try:
                                iframe_response = await client.get(iframe_src, follow_redirects=True)
                                iframe_soup = BeautifulSoup(iframe_response.text, "html.parser")
                                for v in iframe_soup.find_all("video"):
                                    source = v.find("source")
                                    if source and source.get("src"):
                                        src = source["src"]
                                        if any(ext in src.lower() for ext in video_extensions):
                                            if src.startswith("//"):
                                                video_url = "https:" + src
                                            elif src.startswith("/"):
                                                parsed = httpx.URL(url)
                                                video_url = f"{parsed.scheme}://{parsed.host}{src}"
                                            else:
                                                video_url = src
                                            break
                                if video_url:
                                    break
                            except Exception:
                                pass

            if not video_url:
                for script in soup.find_all("script"):
                    script_content = script.string or ""
                    if "video" in script_content.lower() or "mp4" in script_content.lower():
                        for ext in video_extensions:
                            if ext in script_content.lower():
                                match = re.search(r'["\']([^"\']*' + re.escape(ext) + r'[^"\']*)["\']', script_content)
                                if match:
                                    src = match.group(1)
                                    if src.startswith("//"):
                                        video_url = "https:" + src
                                    elif src.startswith("/"):
                                        parsed = httpx.URL(url)
                                        video_url = f"{parsed.scheme}://{parsed.host}{src}"
                                    else:
                                        video_url = src
                                    break
                        if video_url:
                            break

            return {
                "success": True,
                "video_url": video_url,
                "page_text": page_text.strip(),
                "url": url,
            }

    except Exception as e:
        logger.error("Extract video from webpage failed: %s", e)
        return {"success": False, "error": str(e)}


@router.post("/video/process-url")
async def process_video_url(req: VideoProcessRequest):
    if not req.video_url:
        raise HTTPException(status_code=400, detail="请提供视频URL")

    api_key = req.api_key or ARK_CONFIG["default_api_key"]
    if not api_key:
        raise HTTPException(status_code=400, detail="请配置火山方舟API密钥")

    video_extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"]
    is_direct_video = any(ext in req.video_url.lower() for ext in video_extensions)

    page_text = ""
    actual_video_url = req.video_url

    if not is_direct_video:
        logger.info("Processing webpage URL: %s", req.video_url)
        extract_result = await extract_video_from_webpage(req.video_url)
        if not extract_result["success"]:
            raise HTTPException(status_code=400, detail=extract_result.get("error", "无法提取视频"))

        page_text = extract_result.get("page_text", "")
        actual_video_url = extract_result.get("video_url")

        if not actual_video_url:
            raise HTTPException(status_code=400, detail="网页中未找到视频")

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

            response = await client.post(summary_url, json=payload, headers=headers)

            if not response.is_success:
                logger.error("Video URL process failed: %s %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"视频处理失败: {response.text[:200]}"
                )

            result = response.json()
            output_text = extract_video_summary_text(result)

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