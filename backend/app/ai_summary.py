from __future__ import annotations

import json
import logging
import time
from typing import Optional

import requests

from .config import settings

logger = logging.getLogger(__name__)

MODEL_NAME = "deepseek-v4-flash"


class DeepSeekClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    def generate_summary(
        self, content: str, summary_type: str = "摘要", language: str = "中文"
    ) -> str:
        if not content or len(content.strip()) < 50:
            logger.warning("Content too short for summarization")
            return ""

        system_prompt = f"你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份{language}的{summary_type}。"

        user_prompt = f"""请对以下新闻内容进行{summary_type}：

{content[:3000]}

要求：
1. 字数控制在150-200字之间
2. 包含5W1H（何人、何事、何时、何地、为何、如何）的关键信息
3. 突出核心事件和结果
4. 保持客观中立，不添加主观评价
5. 使用{language}
6. 避免使用Markdown格式，纯文本输出"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        return self._call_api(messages, temperature=0.3, max_tokens=500)

    def _call_api(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        retry_count: int = 3,
    ) -> str:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        payload = {
            "model": MODEL_NAME,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        for attempt in range(retry_count):
            try:
                response = requests.post(
                    self.base_url, headers=headers, json=payload, timeout=30
                )
                response.raise_for_status()

                data = response.json()
                if (
                    data.get("choices")
                    and len(data["choices"]) > 0
                    and data["choices"][0].get("message")
                ):
                    return data["choices"][0]["message"]["content"].strip()

                logger.error("Invalid API response: %s", data)
                return ""

            except requests.RequestException as e:
                logger.warning(
                    "API call failed (attempt %d/%d): %s", attempt + 1, retry_count, e
                )
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)
                else:
                    logger.error("API call failed after %d attempts", retry_count)
                    return ""

        return ""


_client = DeepSeekClient(settings.DEEPSEEK_API_KEY, settings.DEEPSEEK_BASE_URL)


def generate_news_summary(content: str) -> str:
    return _client.generate_summary(content, summary_type="摘要", language="中文")


def generate_summary_for_news_item(
    content: str, title: str = "", max_retries: int = 2
) -> str:
    if not content:
        return ""

    full_content = f"标题：{title}\n\n{content}" if title else content

    for attempt in range(max_retries):
        summary = generate_news_summary(full_content)
        if summary:
            return summary
        time.sleep(1)

    logger.error("Failed to generate summary after %d attempts", max_retries)
    return ""