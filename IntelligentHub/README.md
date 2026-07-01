# CQUNEWS 新闻内容摘要与标题生成系统

## 项目概述
基于AI技术的新闻内容智能摘要与标题生成系统，集成新闻爬虫、文本摘要、舆情分析等功能。

## 项目结构
\`\`\`
intelligenthub/
├── app/                    # 后端应用
│   ├── crud/              # 数据库操作
│   ├── routes/            # API路由
│   ├── schemas/           # 数据模型
│   ├── services/          # 业务逻辑
│   ├── utils/             # 工具函数
│   ├── static/            # 静态资源
│   ├── templates/         # HTML模板
│   ├── database.py        # 数据库配置
│   └── main.py            # FastAPI应用入口
├── cqunews-frontend/       # 前端项目（Vue.js）
├── cqunews-backend/        # 后端项目（Java Spring Boot）
├── src/                    # AI服务
│   ├── app.py             # Flask应用
│   ├── config.py          # 配置文件
│   ├── collectors.py      # 新闻收集器
│   ├── processors.py      # 文本处理器
│   └── vllm_client.py     # vLLM客户端
├── news_spider/            # 新闻爬虫
├── run.py                  # 项目启动脚本
├── requirements.txt        # Python依赖
└── 界面设计/               # UI设计文件
\`\`\`

## 技术栈

### 前端
- Vue.js 3
- Vite
- Bootstrap 5
- Vue Router
- Axios

### 后端
- Python 3.8+
- FastAPI
- SQLAlchemy
- MySQL
- JWT认证
- APScheduler

### AI服务
- T5 文本摘要模型
- vLLM 模型推理加速
- Scrapy 爬虫框架
- Flask/FastAPI

## 环境要求
- Python 3.8+
- Node.js 16+
- MySQL 5.7+
- GPU（可选，用于AI加速）

## 快速开始

### 1. 克隆项目
\`\`\`bash
git clone https://github.com/dssfdfs/CQUNEWS.git
cd CQUNEWS
\`\`\`

### 2. 配置环境
创建 \`.env\` 文件并配置相关变量：
\`\`\`
DATABASE_URL=mysql://user:password@localhost/dbname
SECRET_KEY=your-secret-key
API_KEY=your-api-key
\`\`\`

### 3. 安装依赖
\`\`\`bash
# 安装Python依赖
pip install -r requirements.txt

# 安装前端依赖（如需开发前端）
cd cqunews-frontend
npm install
\`\`\`

### 4. 初始化数据库
\`\`\`bash
python -m app.init_db
\`\`\`

### 5. 启动服务
\`\`\`bash
python run.py
\`\`\`

服务默认运行在 \`http://127.0.0.1:8001\`

## 主要功能
- 用户认证和管理（管理员/普通用户）
- 新闻内容智能摘要
- 标题自动生成
- 舆情分析和情感分析
- 新闻历史记录管理
- 新闻源管理
- 定时新闻爬取
- 数据可视化仪表板

## API文档
启动服务后访问：
- Swagger UI: \`http://127.0.0.1:8001/docs\`
- ReDoc: \`http://127.0.0.1:8001/redoc\`

## 开发说明

### 前端开发
\`\`\`bash
cd cqunews-frontend
npm run dev      # 开发服务器
npm run build    # 构建生产版本
\`\`\`

### 后端开发
\`\`\`bash
python run.py    # 启动开发服务器
pytest tests/    # 运行测试
\`\`\`

### AI服务
\`\`\`bash
# 启动爬虫
python news_spider/run_spider.py

# 启动AI推理服务
python src/app.py
\`\`\`

## 部署说明

### 生产环境部署
1. 配置生产环境变量
2. 使用Gunicorn/Uvicorn部署后端服务
3. 构建前端静态文件
4. 配置Nginx反向代理
5. 启动定时任务调度

### Docker部署（推荐）
\`\`\`bash
docker-compose up -d
\`\`\`

## 贡献指南
1. Fork 本仓库
2. 创建特性分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交更改 (\`git commit -m 'Add some AmazingFeature'\`)
4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
5. 开启 Pull Request

## 开发团队
Group 01

## 许可证
MIT License

## 联系方式
- 邮箱: 2766754047@qq.com
- GitHub: https://github.com/dssfdfs/CQUNEWS