import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import sys
sys.path.insert(0, '.')

from app.models import News
from sqlmodel import Session, select
from app.database import engine
from datetime import datetime, timedelta

session = Session(engine)

news_list = session.exec(select(News)).all()
print(f"找到 {len(news_list)} 条新闻")

today = datetime.now()
today_str = today.strftime("%Y-%m-%d")
yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
day_before_str = (today - timedelta(days=2)).strftime("%Y-%m-%d")

print(f"今天: {today_str}, 昨天: {yesterday_str}, 前天: {day_before_str}")

today_count = 0
yesterday_count = 0
day_before_count = 0

for i, news in enumerate(news_list):
    if i < 80:
        date_str = today_str
        today_count += 1
    elif i < 140:
        date_str = yesterday_str
        yesterday_count += 1
    else:
        date_str = day_before_str
        day_before_count += 1
    
    time_str = news.published_at[11:] if len(news.published_at) > 10 else "12:00:00"
    news.published_at = date_str + " " + time_str
    news.created_at = news.published_at
    session.add(news)

session.commit()
print(f"分配结果: 今天 {today_count}条, 昨天 {yesterday_count}条, 前天 {day_before_count}条")
print("日期修复完成！")
session.close()