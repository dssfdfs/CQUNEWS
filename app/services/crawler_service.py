import httpx
from app.utils.html_utils import extract_text_from_html, extract_title_from_html
from app.utils.hash_utils import generate_url_hash


async def fetch_article(url: str):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text


async def crawl_article(url: str):
    html_content = await fetch_article(url)
    title = extract_title_from_html(html_content)
    content = extract_text_from_html(html_content)
    url_hash = generate_url_hash(url)
    return {
        "url": url,
        "url_hash": url_hash,
        "title": title,
        "content": content,
        "text_length": len(content)
    }