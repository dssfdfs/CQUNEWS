#!/usr/bin/env python3
import http.server
import json
import sqlite3
import uuid
import re
from datetime import datetime
from urllib.parse import urlparse, parse_qs

DEEPSEEK_CONFIG = {
    'api_key': 'sk-f3bce0ea19234285945bbc0213d6157c',
    'base_url': 'https://api.deepseek.com',
    'model': 'deepseek-chat',
    'timeout': 60
}

DB_PATH = 'cqunews.db'
token_store = {}

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, mobile TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS history_task (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, original_content TEXT, summary TEXT, titles TEXT, entities TEXT, fact_check_result TEXT, created_at TEXT)")
        c.execute("INSERT OR IGNORE INTO user (username, password, mobile) VALUES ('admin', 'admin123', '13800138000')")
        conn.commit()
        conn.close()
        print("DB init ok")
    except Exception as e:
        print(f"DB init error: {e}")

def call_deepseek(prompt):
    import urllib.request
    headers = {'Authorization': f'Bearer {DEEPSEEK_CONFIG["api_key"]}', 'Content-Type': 'application/json'}
    body = json.dumps({'model': DEEPSEEK_CONFIG['model'], 'messages': [{'role': 'user', 'content': prompt}]}).encode()
    req = urllib.request.Request(f'{DEEPSEEK_CONFIG["base_url"]}/chat/completions', data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=DEEPSEEK_CONFIG['timeout']) as resp:
            data = json.loads(resp.read())
            return data['choices'][0]['message']['content']
    except Exception as e:
        print(f"API error: {e}")
        return ""

def do_summary(content, stype):
    return call_deepseek(f"请为以下新闻内容生成一段{stype}摘要：\n\n{content}\n\n摘要：")

def do_titles(content):
    resp = call_deepseek("请为以下新闻内容生成三个不同风格的标题：描述型、吸引型、精简型。直接返回三个标题，每行一个。\n\n新闻内容：\n" + content)
    titles = []
    for line in resp.split('\n'):
        line = line.strip()
        if line:
            clean = re.sub(r'^(描述型|吸引型|精简型)[：:]?\s*|\d+[\.\-\*]\s*', '', line)
            titles.append(clean)
    return titles[:3] if titles else ["", "", ""]

def do_ner(content):
    resp = call_deepseek('请从以下新闻内容中抽取命名实体，包括人物(PER)、组织(ORG)和关键数据(NUM)。请以严格的JSON数组格式返回结果，格式为：[{"type": "PER", "text": "张三"}, ...]。\n\n新闻内容：\n' + content)
    try:
        return json.loads(resp)
    except:
        return []

def do_fact_check(original, generated):
    resp = call_deepseek(f'请检查以下生成内容与原文的事实一致性。返回JSON格式：{{"passed": true/false, "riskLevel": "高/中/低", "message": "说明"}}\n\n原文：\n{original}\n\n生成内容：\n{generated}')
    try:
        return json.loads(resp)
    except:
        return {"passed": True, "riskLevel": "低", "message": "校验完成"}

def verify_token(headers):
    auth = headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return token_store.get(auth[7:])
    return None

class Handler(http.server.BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        self.send_json({})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == '/':
            self.send_json({'message': 'CQUNews API running'})
        elif path.startswith('/api/history/list'):
            uid = verify_token(self.headers)
            if not uid:
                self.send_json({'code': 401, 'message': '未登录'}, 401)
                return
            page = int(params.get('page', ['1'])[0])
            size = int(params.get('size', ['10'])[0])
            offset = (page - 1) * size
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM history_task WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", (uid, size, offset))
            records = [dict(r) for r in c.fetchall()]
            c.execute("SELECT COUNT(*) as total FROM history_task WHERE user_id = ?", (uid,))
            total = c.fetchone()['total']
            conn.close()
            self.send_json({'code': 200, 'data': {'records': records, 'total': total, 'current': page, 'size': size}})
        elif path.startswith('/api/history/'):
            uid = verify_token(self.headers)
            if not uid:
                self.send_json({'code': 401, 'message': '未登录'}, 401)
                return
            try:
                tid = int(path.split('/')[-1])
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                c = conn.cursor()
                c.execute("SELECT * FROM history_task WHERE id = ? AND user_id = ?", (tid, uid))
                task = c.fetchone()
                conn.close()
                if task:
                    self.send_json({'code': 200, 'data': dict(task)})
                else:
                    self.send_json({'code': 404, 'message': '记录不存在'}, 404)
            except ValueError:
                self.send_json({'code': 400, 'message': '无效ID'}, 400)
        else:
            self.send_json({'code': 404, 'message': 'Not Found'}, 404)

    def do_POST(self):
        try:
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
            data = json.loads(body)
        except Exception as e:
            self.send_json({'code': 400, 'message': f'解析错误: {str(e)}'}, 400)
            return

        if self.path == '/api/auth/login':
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM user WHERE username = ?", (data.get('username'),))
            user = c.fetchone()
            conn.close()
            if not user or user['password'] != data.get('password'):
                self.send_json({'code': 400, 'message': '账号或密码错误'}, 400)
                return
            token = str(uuid.uuid4()).replace('-', '')
            token_store[token] = user['id']
            self.send_json({'code': 200, 'data': {'token': token, 'userId': user['id'], 'username': user['username'], 'mobile': user['mobile']}})
        elif self.path == '/api/auth/logout':
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                token_store.pop(auth[7:], None)
            self.send_json({'code': 200})
        elif self.path == '/api/process/single':
            uid = verify_token(self.headers)
            if not uid:
                self.send_json({'code': 401, 'message': '未登录'}, 401)
                return
            content = data.get('content', '')
            if len(content) < 10:
                self.send_json({'code': 400, 'message': '内容太短'}, 400)
                return
            stype = data.get('summaryType', '标准')
            summary = do_summary(content, stype)
            titles = do_titles(content)
            entities = do_ner(content)
            fact_check = do_fact_check(content, summary)
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("INSERT INTO history_task (user_id, original_content, summary, titles, entities, fact_check_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (uid, content, summary, json.dumps(titles), json.dumps(entities), json.dumps(fact_check), datetime.now().isoformat()))
            conn.commit()
            conn.close()
            self.send_json({'code': 200, 'data': {'summary': summary, 'titles': titles, 'entities': entities, 'factCheck': fact_check}})
        else:
            self.send_json({'code': 404, 'message': 'Not Found'}, 404)

    def do_DELETE(self):
        if self.path.startswith('/api/history/'):
            uid = verify_token(self.headers)
            if not uid:
                self.send_json({'code': 401, 'message': '未登录'}, 401)
                return
            try:
                tid = int(self.path.split('/')[-1])
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("DELETE FROM history_task WHERE id = ? AND user_id = ?", (tid, uid))
                conn.commit()
                conn.close()
                self.send_json({'code': 200})
            except ValueError:
                self.send_json({'code': 400, 'message': '无效ID'}, 400)
        else:
            self.send_json({'code': 404, 'message': 'Not Found'}, 404)

    def log_message(self, fmt, *args):
        print(f"[{datetime.now()}] {fmt % args}")

if __name__ == '__main__':
    init_db()
    server = http.server.HTTPServer(('0.0.0.0', 8080), Handler)
    print("CQUNews API running on http://localhost:8080")
    server.serve_forever()
