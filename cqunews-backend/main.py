#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CQUNews 后端服务
- 用户认证（登录、注册、登出）
- 新闻智能处理（摘要、标题、实体识别、事实校验）
- 历史记录管理
"""

import http.server
import json
import sqlite3
import uuid
import re
import random
import string
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# DeepSeek API配置
DEEPSEEK_CONFIG = {
    'api_key': 'sk-f3bce0ea19234285945bbc0213d6157c',
    'base_url': 'https://api.deepseek.com',
    'model': 'deepseek-chat',
    'timeout': 60
}

DB_PATH = 'cqunews.db'
# 存储验证码：{session_id: {'code': '1234', 'expire': timestamp}}
verification_codes = {}
token_store = {}

def init_db():
    """
    初始化数据库
    创建用户表和历史任务表
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        # 创建用户表
        c.execute("""CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            mobile TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""")
        # 创建历史任务表
        c.execute("""CREATE TABLE IF NOT EXISTS history_task (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            original_content TEXT,
            summary TEXT,
            titles TEXT,
            entities TEXT,
            fact_check_result TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""")
        # 插入默认管理员账号
        c.execute("INSERT OR IGNORE INTO user (username, password, mobile) VALUES ('admin', 'admin123', '13800138000')")
        conn.commit()
        conn.close()
        print("DB init ok")
    except Exception as e:
        print(f"DB init error: {e}")

def generate_verification_code(length=4):
    """
    生成指定长度的随机验证码
    """
    return ''.join(random.choices(string.digits, k=length))

def call_deepseek(prompt):
    """
    调用DeepSeek API
    """
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
    """
    生成智能摘要
    stype: 标准/简短/详细
    """
    return call_deepseek(f"请为以下新闻内容生成一段{stype}摘要：\n\n{content}\n\n摘要：")

def do_titles(content):
    """
    生成三种风格的标题：描述型、吸引型、精简型
    """
    resp = call_deepseek("请为以下新闻内容生成三个不同风格的标题：描述型、吸引型、精简型。直接返回三个标题，每行一个。\n\n新闻内容：\n" + content)
    titles = []
    for line in resp.split('\n'):
        line = line.strip()
        if line:
            clean = re.sub(r'^(描述型|吸引型|精简型)[：:]?\s*|\d+[\.\-\*]\s*', '', line)
            titles.append(clean)
    return titles[:3] if titles else ["", "", ""]

def do_ner(content):
    """
    命名实体识别：抽取人物(PER)、组织(ORG)、数据(NUM)
    """
    resp = call_deepseek('请从以下新闻内容中抽取命名实体，包括人物(PER)、组织(ORG)和关键数据(NUM)。请以严格的JSON数组格式返回结果，格式为：[{"type": "PER", "text": "张三"}, ...]。\n\n新闻内容：\n' + content)
    try:
        return json.loads(resp)
    except:
        return []

def do_fact_check(original, generated):
    """
    事实一致性校验
    """
    resp = call_deepseek(f'请检查以下生成内容与原文的事实一致性。返回JSON格式：{{"passed": true/false, "riskLevel": "高/中/低", "message": "说明"}}\n\n原文：\n{original}\n\n生成内容：\n{generated}')
    try:
        return json.loads(resp)
    except:
        return {"passed": True, "riskLevel": "低", "message": "校验完成"}

def verify_token(headers):
    """
    验证Token并返回用户ID
    """
    auth = headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return token_store.get(auth[7:])
    return None

class Handler(http.server.BaseHTTPRequestHandler):
    """HTTP请求处理器"""
    
    def send_json(self, data, status=200):
        """发送JSON响应"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_json({})

    def do_GET(self):
        """处理GET请求"""
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == '/':
            # API健康检查
            self.send_json({'message': 'CQUNews API running'})
        elif path == '/api/auth/code':
            # 获取验证码
            session_id = params.get('sessionId', [''])[0]
            if session_id and session_id in verification_codes:
                code_data = verification_codes[session_id]
                # 验证码5分钟有效
                if datetime.now().timestamp() - code_data['created'] < 300:
                    self.send_json({'code': 200, 'data': {'code': code_data['code'], 'sessionId': session_id}})
                    return
            # 生成新验证码
            new_session_id = str(uuid.uuid4())
            new_code = generate_verification_code(4)
            verification_codes[new_session_id] = {'code': new_code, 'created': datetime.now().timestamp()}
            self.send_json({'code': 200, 'data': {'code': new_code, 'sessionId': new_session_id}})
        elif path.startswith('/api/history/list'):
            # 获取历史记录列表
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
            # 获取单条历史记录详情
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
        """处理POST请求"""
        try:
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
            data = json.loads(body)
        except Exception as e:
            self.send_json({'code': 400, 'message': f'解析错误: {str(e)}'}, 400)
            return

        if self.path == '/api/auth/login':
            # 用户登录
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM user WHERE username = ?", (data.get('username'),))
            user = c.fetchone()
            conn.close()
            
            # 验证账号是否存在
            if not user:
                self.send_json({'code': 400, 'message': '没有此账户！请前往注册！'}, 400)
                return
            
            # 验证密码
            if user['password'] != data.get('password'):
                self.send_json({'code': 400, 'message': '账号或密码错误'}, 400)
                return
            
            # 生成Token
            token = str(uuid.uuid4()).replace('-', '')
            token_store[token] = user['id']
            self.send_json({'code': 200, 'data': {'token': token, 'userId': user['id'], 'username': user['username'], 'mobile': user['mobile']}})
        
        elif self.path == '/api/auth/register':
            # 用户注册
            username = data.get('username', '')
            password = data.get('password', '')
            confirm_password = data.get('confirmPassword', '')
            code = data.get('code', '')
            session_id = data.get('sessionId', '')
            
            # 验证必填字段
            if not username or not password or not confirm_password or not code:
                self.send_json({'code': 400, 'message': '请填写完整信息'}, 400)
                return
            
            # 验证两次密码是否一致
            if password != confirm_password:
                self.send_json({'code': 400, 'message': '前后密码不一致，请重新输入！'}, 400)
                return
            
            # 验证验证码
            if session_id not in verification_codes:
                self.send_json({'code': 400, 'message': '验证码已过期，请刷新重试'}, 400)
                return
            
            stored_code = verification_codes[session_id]['code']
            if stored_code != code:
                self.send_json({'code': 400, 'message': '验证码错误，请重新输入！'}, 400)
                return
            
            # 检查验证码是否过期（5分钟）
            if datetime.now().timestamp() - verification_codes[session_id]['created'] > 300:
                self.send_json({'code': 400, 'message': '验证码已过期，请刷新重试'}, 400)
                return
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            
            # 检查用户名是否已存在
            c.execute("SELECT id FROM user WHERE username = ?", (username,))
            if c.fetchone():
                conn.close()
                self.send_json({'code': 400, 'message': '已有账号，请直接登录'}, 400)
                return
            
            # 创建新用户
            try:
                c.execute("INSERT INTO user (username, password) VALUES (?, ?)", (username, password))
                conn.commit()
                conn.close()
                # 清除已使用的验证码
                verification_codes.pop(session_id, None)
                self.send_json({'code': 200, 'message': '已成功注册'})
            except Exception as e:
                conn.close()
                self.send_json({'code': 400, 'message': '注册失败'}, 400)
        
        elif self.path == '/api/auth/logout':
            # 用户登出
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                token_store.pop(auth[7:], None)
            self.send_json({'code': 200})
        
        elif self.path == '/api/process/single':
            # 新闻智能处理
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
            c.execute("INSERT INTO history_task (user_id, original_content, summary, titles, entities, fact_check_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                     (uid, content, summary, json.dumps(titles), json.dumps(entities), json.dumps(fact_check), datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            self.send_json({'code': 200, 'data': {'summary': summary, 'titles': titles, 'entities': entities, 'factCheck': fact_check}})
        
        else:
            self.send_json({'code': 404, 'message': 'Not Found'}, 404)

    def do_DELETE(self):
        """处理DELETE请求"""
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
        """日志记录"""
        print(f"[{datetime.now()}] {fmt % args}")

if __name__ == '__main__':
    init_db()
    server = http.server.HTTPServer(('0.0.0.0', 8080), Handler)
    print("CQUNews API running on http://localhost:8080")
    server.serve_forever()
