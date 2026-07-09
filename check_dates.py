import requests

r = requests.get('http://localhost:8000/api/news?page_size=100')
data = r.json()

print("当前新闻日期分布:")
date_counts = {}
for item in data['items']:
    pub_date = item['published_at'][:10] if item['published_at'] else 'N/A'
    date_counts[pub_date] = date_counts.get(pub_date, 0) + 1

for date, count in sorted(date_counts.items()):
    print(f"  {date}: {count}条")

print(f"\n总新闻数: {data['total']}")