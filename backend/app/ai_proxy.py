from __future__ import annotations

import json
import os
from typing import Any, Optional

import httpx
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
        "url": "https://api.doubao.com/chat/completions",
        "default_key": "",
        "model_name": "doubao-pro",
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

    target_url = req.api_url if (req.api_url and req.api_url != '/api/process') else config["url"]
    target_api_key = req.api_key or config["default_key"]
    target_model = config["model_name"]

    if not target_api_key:
        raise HTTPException(status_code=400, detail="请在设置中心配置API密钥")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
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
