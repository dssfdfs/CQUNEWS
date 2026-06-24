import httpx
import logging
import json
import random
from .config import settings

logger = logging.getLogger("intelligenthub")

class VLLMClient:
    def __init__(self):
        self.base_url = settings.VLLM_URL.rstrip("/")
        self.model = getattr(settings, "VLLM_MODEL", "default-model")
        self.mock_mode = getattr(settings, "MOCK_MODE", False)

    async def analyze(self, text: str, max_tokens: int = 300) -> dict:
        if self.mock_mode:
            logger.info("Running in MOCK mode, skipping vLLM call")
            return self._mock_analyze(text)

        prompt = f"""
你是一个新闻内容分析助手。请仔细阅读下面的新闻文本，并根据以下要求输出结果：
1. 判断这条新闻是否重要、有社会或经济价值，用布尔值表示（True/False）。
2. 生成简要摘要（最多 200 字），总结核心事件和要点。

新闻内容如下：
{text}

请直接输出 JSON，格式如下：
{{
  "keep": true/false,
  "summary": "简要摘要内容"
}}
"""

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "你是一个精确的新闻摘要与筛选助手。"},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "top_p": 0.9,
        }

        try:
            async with httpx.AsyncClient(timeout=90) as client:
                logger.info(f"Sending request to vLLM: {self.base_url}/v1/chat/completions")
                resp = await client.post(f"{self.base_url}/v1/chat/completions", json=payload)
                resp.raise_for_status()
                data = resp.json()
                logger.debug(f"vLLM raw response: {json.dumps(data, ensure_ascii=False)[:800]}")

                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )

                try:
                    result = json.loads(content)
                except Exception:
                    logger.warning(f"Failed to parse model output as JSON: {content}")
                    result = {"keep": False, "summary": content}

                result.setdefault("keep", False)
                result.setdefault("summary", "")
                result["meta"] = {
                    "usage": data.get("usage"),
                    "model": data.get("model"),
                    "finish_reason": data.get("choices", [{}])[0].get("finish_reason"),
                }

                logger.info(f"Model result: keep={result['keep']} summary_len={len(result['summary'])}")
                return result

        except httpx.HTTPStatusError as e:
            logger.error(f"vLLM HTTP error: {e.response.status_code} {e.response.text}")
        except Exception as e:
            logger.exception(f"vLLM analyze unexpected error: {e}")

        return {"keep": False, "summary": "", "meta": {}}

    def _mock_analyze(self, text: str) -> dict:
        keep = random.choice([True, True, False])
        summary = f"[Mock摘要] 这是一篇关于{text[:30]}...的新闻报道，内容涉及多个方面的信息，具有一定的新闻价值。"
        return {
            "keep": keep,
            "summary": summary,
            "meta": {
                "usage": {"prompt_tokens": len(text), "completion_tokens": 100},
                "model": "mock-model",
                "finish_reason": "stop",
            },
            "text": text[:500] + "..." if len(text) > 500 else text,
        }

vllm = VLLMClient()
