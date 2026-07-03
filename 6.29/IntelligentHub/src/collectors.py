from bs4 import BeautifulSoup
import httpx
import logging

logger = logging.getLogger("intelligenthub")

async def fetch_article_text(url: str) -> str:
    """抓取文章正文"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        paragraphs = soup.find_all("p")
        text = "\n".join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
        logger.info(f"Fetched {len(text)} chars from {url}")
        logger.info(text)

        return text
    except Exception as e:
        logger.error(f"Fetch error for {url}: {e}")
        return ""
