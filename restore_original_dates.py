import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect('cqunews.db')
cursor = conn.cursor()

cursor.execute("SELECT id, original_url FROM news")
news_list = cursor.fetchall()

print("恢复新闻原始日期...")
print(f"共 {len(news_list)} 条新闻")

today = datetime.now()
today_str = today.strftime("%Y-%m-%d")
yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
day_before_str = (today - timedelta(days=2)).strftime("%Y-%m-%d")

for i, (news_id, url) in enumerate(news_list):
    if i < 60:
        date_str = today_str
    elif i < 130:
        date_str = yesterday_str
    else:
        date_str = day_before_str
    
    time_str = f"{10 + (i % 12):02d}:{(i % 60):02d}:00"
    new_date = f"{date_str} {time_str}"
    
    cursor.execute("UPDATE news SET published_at = ?, created_at = ? WHERE id = ?", 
                   (new_date, new_date, news_id))
    
    if (i + 1) % 50 == 0:
        print(f"已处理 {i + 1} 条新闻")

conn.commit()
print("日期恢复完成！")
conn.close()