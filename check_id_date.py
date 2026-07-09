import sqlite3

conn = sqlite3.connect('cqunews.db')
cursor = conn.cursor()

cursor.execute("SELECT id, published_at FROM news ORDER BY id DESC LIMIT 20")
rows = cursor.fetchall()
print("ID最大的20条新闻:")
for row in rows:
    print(f"  ID:{row[0]}, Date:{row[1][:10]}")

cursor.execute("SELECT id, published_at FROM news WHERE published_at LIKE '2026-07-08%' ORDER BY id DESC LIMIT 10")
rows = cursor.fetchall()
print("\n7月8日新闻中ID最大的10条:")
for row in rows:
    print(f"  ID:{row[0]}, Date:{row[1][:10]}")

cursor.execute("SELECT COUNT(*) FROM news WHERE audit_status = 1")
total_approved = cursor.fetchone()[0]
print(f"\n审核通过的新闻总数: {total_approved}")

cursor.execute("SELECT COUNT(*) FROM news WHERE audit_status = 1 AND published_at LIKE '2026-07-08%'")
today_approved = cursor.fetchone()[0]
print(f"7月8日审核通过的新闻数: {today_approved}")

conn.close()