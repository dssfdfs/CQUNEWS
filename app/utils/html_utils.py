from bs4 import BeautifulSoup
import re


def extract_text_from_html(html_content: str, url: str = "") -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    
    for script in soup(["script", "style", "nav", "header", "footer", "iframe", "noscript"]):
        script.decompose()
    
    content_selectors = [
        "article",
        "#article",
        ".article",
        ".article-content",
        ".articleBody",
        ".article-body",
        ".main-content",
        "#main-content",
        ".content",
        ".news-content",
        "#news-content",
        ".article_text",
        "#artibody",
        ".artibody",
        ".detail-content",
        ".text-article",
    ]
    
    for selector in content_selectors:
        content = soup.select_one(selector)
        if content:
            text = content.get_text(separator="\n", strip=True)
            if len(text) > 200:
                text = re.sub(r"\n+", "\n", text)
                return text.strip()
    
    text = soup.get_text(separator="\n", strip=True)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def extract_title_from_html(html_content: str, url: str = "") -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    
    title_selectors = [
        "h1",
        ".main-title",
        ".article-title",
        "#article-title",
        ".title",
        ".news-title",
        ".title-area h1",
        "#artibodyTitle",
        ".artibodyTitle",
    ]
    
    for selector in title_selectors:
        title_tag = soup.select_one(selector)
        if title_tag:
            title = title_tag.get_text().strip()
            if len(title) > 5 and len(title) < 100:
                return title
    
    if soup.title:
        title = soup.title.string.strip()
        if "-" in title:
            title = title.split("-")[0].strip()
        if len(title) > 5 and len(title) < 100:
            return title
    
    return ""