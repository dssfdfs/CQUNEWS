from .vllm_client import vllm
import logging

logger = logging.getLogger("intellgenthub")

async def score_and_filter(article: dict) -> dict:
    text = ((article.get('title') or '') + '\n\n' + (article.get('text') or '')).strip()
    logger.info(f"Processing article text length: {len(text)}")

    res = await vllm.analyze(text)
    keep = res.get("keep", False)
    summary = res.get("summary", "")

    score = 1.0 if keep else 0.0  # 简化评分逻辑，可按需要调整
    logger.info(f"Article keep={keep}, summary length={len(summary)}")
    return {"score": score, "keep": keep, "summary": summary, "meta": res.get("meta"),"text": res.get("text")}
