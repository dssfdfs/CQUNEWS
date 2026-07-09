import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import News, CrawlLog
from sqlmodel import Session, select, text
from app.database import engine
from app.crawler import run_crawl

session = Session(engine)

print("=== 删除现有数据 ===")
news_list = session.exec(select(News)).all()
news_count = len(news_list)
session.exec(text("DELETE FROM news"))
session.commit()
print(f"已删除 {news_count} 条新闻")

try:
    log_list = session.exec(select(CrawlLog)).all()
    log_count = len(log_list)
    session.exec(text("DELETE FROM crawl_log"))
    session.commit()
    print(f"已删除 {log_count} 条爬取日志")
except Exception:
    print("crawl_log 表不存在，跳过")

session.close()

print("\n=== 重新爬取新闻 ===")
results = run_crawl(max_articles_per_source=15)

total_crawled = 0
for result in results:
    print(f"\n{result.source_name}:")
    print(f"  成功: {len(result.items)}, 错误: {len(result.errors)}")
    total_crawled += len(result.items)

print(f"\n=== 爬取完成 ===")
print(f"共获取 {total_crawled} 条新闻")

session2 = Session(engine)
cursor = session2.exec(
    text("SELECT SUBSTR(published_at, 1, 10) as date, COUNT(*) as count FROM news GROUP BY date ORDER BY date DESC")
).all()
print("\n日期分布:")
for row in cursor:
    print(f"  {row[0]}: {row[1]}条")
session2.close()