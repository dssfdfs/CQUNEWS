from app.models import News
from sqlmodel import Session, select
from app.database import engine
from datetime import datetime

session = Session(engine)
today = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
today_date = datetime.now().strftime("%Y-%m-%d")

news_list = session.exec(select(News).where(News.published_at.like("2026-07-07%"))).all()
print(f"找到 {len(news_list)} 条7月7日的新闻")

for news in news_list:
    news.published_at = today
    news.created_at = today
    session.add(news)

session.commit()
print(f"已将 {len(news_list)} 条新闻更新为今日日期")
session.close()