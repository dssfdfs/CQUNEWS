import sys
sys.path.insert(0, '.')

from app.models import News, CrawlLog
from sqlmodel import Session, select
from app.database import engine
from app.crawler import crawl_source, get_sources

session = Session(engine)

print("删除所有新闻记录...")
news_count = session.exec(select(News)).count()
session.exec("DELETE FROM news")
session.commit()
print(f"已删除 {news_count} 条新闻")

print("\n删除所有爬取日志...")
log_count = session.exec(select(CrawlLog)).count()
session.exec("DELETE FROM crawl_log")
session.commit()
print(f"已删除 {log_count} 条日志")

print("\n重新爬取新闻...")
sources = get_sources()
total_crawled = 0
for source in sources:
    print(f"\n正在爬取 {source.name}...")
    result = crawl_source(source, max_articles=10)
    print(f"  成功: {len(result.items)}, 错误: {len(result.errors)}")
    total_crawled += len(result.items)

print(f"\n爬取完成！共获取 {total_crawled} 条新闻")
session.close()