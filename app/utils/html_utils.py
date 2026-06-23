from bs4 import BeautifulSoup
import re


def extract_text_from_html(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    for script in soup(["script", "style", "nav", "header", "footer"]):
        script.decompose()
    text = soup.get_text(separator="\n", strip=True)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def extract_title_from_html(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    title = soup.title
    if title:
        return title.string.strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text().strip()
    return ""