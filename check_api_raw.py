import requests

print("=== 不带参数 ===")
r = requests.get('http://localhost:8000/api/news?page_size=100')
data = r.json()
print(f"Total: {data['total']}")

date_counts = {}
for item in data['items']:
    pub_date = item['published_at'][:10] if item['published_at'] else 'N/A'
    date_counts[pub_date] = date_counts.get(pub_date, 0) + 1

for date, count in sorted(date_counts.items()):
    print(f"  {date}: {count}条")

print("\n=== 带today_only=true ===")
r2 = requests.get('http://localhost:8000/api/news?page_size=100&today_only=true')
data2 = r2.json()
print(f"Total: {data2['total']}")

date_counts2 = {}
for item in data2['items']:
    pub_date = item['published_at'][:10] if item['published_at'] else 'N/A'
    date_counts2[pub_date] = date_counts2.get(pub_date, 0) + 1

for date, count in sorted(date_counts2.items()):
    print(f"  {date}: {count}条")