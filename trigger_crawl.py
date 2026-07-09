import requests

print("登录获取token...")
login_data = {
    'account': 'hello',
    'password': '123456'
}
r = requests.post('http://localhost:8000/api/auth/login', json=login_data)
print(f"登录响应: {r.status_code}")
if r.status_code == 200:
    token = r.json().get('token')
    print("登录成功")
    
    print("\n触发新闻爬取...")
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.post('http://localhost:8000/api/crawl/run', headers=headers)
    print(f"爬取响应: {r2.status_code}")
    if r2.status_code == 200:
        data = r2.json()
        print(f"消息: {data.get('message')}")
    else:
        print(f"爬取失败: {r2.text}")
else:
    print(f"登录失败: {r.text}")

print("\n检查新闻日期...")
r3 = requests.get('http://localhost:8000/api/news?page_size=20')
data3 = r3.json()

print("\n当前新闻日期分布:")
date_counts = {}
for item in data3['items']:
    pub_date = item['published_at'][:10] if item['published_at'] else 'N/A'
    date_counts[pub_date] = date_counts.get(pub_date, 0) + 1

for date, count in sorted(date_counts.items()):
    print(f"  {date}: {count}条")

print(f"\n总新闻数: {data3['total']}")