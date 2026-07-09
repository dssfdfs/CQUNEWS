import sqlite3

conn = sqlite3.connect('cqunews.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT SUBSTR(published_at, 1, 10) as date, 
           audit_status, 
           COUNT(*) as count 
    FROM news 
    GROUP BY date, audit_status 
    ORDER BY date DESC, audit_status
""")
rows = cursor.fetchall()
print("各日期各审核状态的新闻数:")
for row in rows:
    status_text = "通过" if row[1] == 1 else "待审核" if row[1] == 0 else f"其他({row[1]})"
    print(f"  {row[0]} - {status_text}: {row[2]}条")

conn.close()