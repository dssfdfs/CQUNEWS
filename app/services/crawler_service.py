import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from app.utils.html_utils import extract_text_from_html, extract_title_from_html
from app.utils.hash_utils import generate_url_hash


async def fetch_article(url: str):
    async with httpx.AsyncClient(timeout=30, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text


async def crawl_article(url: str):
    html_content = await fetch_article(url)
    title = extract_title_from_html(html_content, url)
    content = extract_text_from_html(html_content, url)
    url_hash = generate_url_hash(url)
    return {
        "url": url,
        "url_hash": url_hash,
        "title": title,
        "content": content,
        "text_length": len(content)
    }


async def extract_links(url: str):
    html_content = await fetch_article(url)
    soup = BeautifulSoup(html_content, 'html.parser')
    links = []
    base_domain = urlparse(url).netloc
    
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        full_url = urljoin(url, href)
        
        parsed = urlparse(full_url)
        if parsed.netloc == base_domain and parsed.scheme in ['http', 'https']:
            if full_url not in links:
                links.append(full_url)
    
    return links


def is_news_article(url: str):
    news_patterns = [
        '/article/', '/news/', '/story/', '/post/', 
        '/doc-', '/item/', '/detail/', '/content/',
        '.html', '.htm'
    ]
    
    for pattern in news_patterns:
        if pattern in url.lower():
            return True
    return False


async def crawl_source(source_url: str, max_depth: int = 2, max_articles: int = 10):
    crawled_urls = set()
    articles = []
    urls_to_crawl = [(source_url, 0)]
    
    while urls_to_crawl and len(articles) < max_articles:
        current_url, depth = urls_to_crawl.pop(0)
        
        if current_url in crawled_urls:
            continue
        crawled_urls.add(current_url)
        
        try:
            if depth < max_depth:
                links = await extract_links(current_url)
                for link in links:
                    if link not in crawled_urls and depth + 1 <= max_depth:
                        if is_news_article(link):
                            if len(articles) < max_articles:
                                urls_to_crawl.insert(0, (link, depth + 1))
                        else:
                            urls_to_crawl.append((link, depth + 1))
            
            if is_news_article(current_url) and len(articles) < max_articles:
                article_data = await crawl_article(current_url)
                if article_data['text_length'] > 100:
                    articles.append(article_data)
        
        except Exception as e:
            print(f"Failed to crawl {current_url}: {str(e)}")
            continue
    
    return articles