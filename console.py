import asyncio
from rich.console import Console
from rich.table import Table
from rich.progress import track
import httpx
import os

os.environ["API_KEY"] = "1234"

console = Console()
API_KEY = "1234"
BASE_URL = "http://127.0.0.1:8000"

URLS = [
    "https://news.sina.com.cn/c/2025-10-25/doc-infvaiqv7683069.shtml",
    # 可以加更多 URL
]

async def ingest_url(url: str):
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{BASE_URL}/ingest",
            json={"url": url},
            headers={"x-api-key": API_KEY}
        )
        r.raise_for_status()
        return r.json()

async def main():
    results = []
    for url in track(URLS, description="Processing URLs..."):
        try:
            res = await ingest_url(url)
            results.append({"url": url, **res})
        except Exception as e:
            console.print(f"[red]Error processing {url}: {e}[/red]")

    table = Table(title="新闻抓取结果")
    table.add_column("URL", style="cyan")
    table.add_column("保留?", style="green")
    table.add_column("分数", style="magenta")
    table.add_column("摘要", style="yellow")
    table.add_column("正文长度", style="blue")
    table.add_column("vLLM meta", style="white")

    for r in results:
        debug = r.get("debug_article", {})
        table.add_row(
            r["url"],
            str(r.get("kept")),
            f"{r.get('score',0):.2f}",
            r.get("summary") or "-",
            str(debug.get("text_length", 0)),
            str(debug.get("meta", {}))
        )
    console.print(table)

if __name__ == "__main__":
    asyncio.run(main())
