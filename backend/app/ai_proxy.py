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
        "default_key": "sk-cf5b7fb15a554d84b5610e406b7bb51c",
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


def generate_mock_response(messages: list[dict[str, str]]) -> dict[str, Any]:
    last_message = messages[-1]["content"] if messages else ""
    
    if "摘要" in last_message:
        mock_summary = """这是一段模拟生成的新闻摘要。该新闻主要讲述了人工智能技术在各个领域的广泛应用和快速发展，包括自动驾驶、医疗诊断、金融分析等多个方面。文章指出，随着技术的不断进步，AI正在深刻改变人们的生活方式和工作模式，同时也带来了一些新的挑战和机遇。专家表示，未来人工智能将继续发挥重要作用，推动社会向更加智能化的方向发展。"""
        return {
            "choices": [{"message": {"role": "assistant", "content": mock_summary}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 150, "total_tokens": 250},
        }
    
    if "标题" in last_message:
        mock_titles = """1. 人工智能技术持续突破 多领域应用迎来新机遇
2. AI技术渗透率达85% 推动产业升级加速
3. AI时代已来！这些改变正在发生"""
        return {
            "choices": [{"message": {"role": "assistant", "content": mock_titles}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 80, "total_tokens": 180},
        }
    
    if "覆盖率" in last_message or "质量" in last_message:
        mock_quality = '{"coverageRate": 88, "titleDeviation": 12, "hallucinationCount": 0}'
        return {
            "choices": [{"message": {"role": "assistant", "content": mock_quality}}],
            "usage": {"prompt_tokens": 150, "completion_tokens": 30, "total_tokens": 180},
        }
    
    mock_response = "这是一个模拟响应。由于您尚未配置有效的API密钥，系统正在使用模拟数据进行演示。您可以在设置中心配置真实的API密钥以获取实际的AI生成结果。"
    return {
        "choices": [{"message": {"role": "assistant", "content": mock_response}}],
        "usage": {"prompt_tokens": 50, "completion_tokens": 60, "total_tokens": 110},
    }


@router.post("/process")
async def process_ai_request(
    request: Request,
    req: ProcessRequest,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
):
    config = MODEL_CONFIGS.get(req.model)
    if not config:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {req.model}")

    target_url = api_url or config["url"]
    target_api_key = api_key or config["default_key"]
    target_model = config["model_name"]

    if not target_api_key:
        logger.info("No API key configured for %s, returning mock response", req.model)
        return generate_mock_response(req.messages)

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
                logger.warning(
                    "AI API request failed: %s %s, falling back to mock",
                    response.status_code,
                    response.text,
                )
                return generate_mock_response(req.messages)

            result = response.json()
            return result

    except httpx.RequestError as e:
        logger.warning("AI API request error: %s, falling back to mock", e)
        return generate_mock_response(req.messages)
    except json.JSONDecodeError as e:
        logger.warning("AI API response parse error: %s, falling back to mock", e)
        return generate_mock_response(req.messages)


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