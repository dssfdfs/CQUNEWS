# IntelligentHub

**English Version Below | 英文版本在下方**

## 项目简介

IntelligentHub 是一个轻量级的智能新闻聚合与摘要系统。  
它能够自动抓取网站上的新闻内容，通过本地或远程部署的 **vLLM** 模型进行分析、筛选和摘要生成。  
系统采用模块化设计，易于扩展和迁移，适合个人或团队搭建自己的 AI 新闻中枢。

## 功能特点

- 自动抓取指定新闻网站的内容  
- 调用 vLLM 模型生成新闻摘要  
- 过滤无价值或重复新闻  
- 提供命令行可视化界面  
- 支持本地数据库存储结果（可选）  
- 模块化结构，便于扩展自定义模型或接口  

## 快速开始

### 环境要求
- Python 3.10+
- vLLM 服务（例如运行在 `http://223.111.149.172:8000`）
- pip 或 conda 环境

### 安装依赖
```bash
pip install -r requirements.txt
```

### 运行主服务
```bash
python src/app.py
```

默认运行在：
```
http://127.0.0.1:8000
```

### 运行控制台模式（测试摘要生成）
```bash
python src/console.py
```

控制台会显示每条新闻的处理结果，包括 URL、得分、摘要和是否保留。

### 环境变量
你可以在 `.env` 文件中配置 vLLM 服务地址和 API Key：
```
VLLM_URL=http://223.111.149.172:8000
API_KEY=1234
```

## 项目结构
```
intelligenthub/
├── src/
│   ├── app.py           # FastAPI 主程序
│   ├── console.py       # 命令行可视化控制台
│   ├── config.py        # 配置管理
│   ├── processors.py    # 抓取、摘要与筛选逻辑
│   ├── vllm_client.py   # vLLM 接口封装
│   └── utils.py         # 工具函数
├── requirements.txt
├── README.md
└── .env.example
```

## 开发与扩展

你可以轻松替换 `vllm_client.py`，接入任意兼容 OpenAI 格式的 LLM 服务。  
或扩展 `processors.py` 以增加内容分类、关键词提取等功能。

---

# IntelligentHub (English)

## Overview

**IntelligentHub** is a lightweight, modular system for intelligent news aggregation and summarization.  
It crawls news from given URLs, filters out low-value content, and generates concise summaries using a vLLM-powered backend.

## Features

- Crawl and parse news articles automatically  
- Summarize and score news with vLLM  
- Filter low-value or redundant items  
- Console-based visualization for testing  
- Optional local database support  
- Modular and easily extensible  

## Quick Start

### Requirements
- Python 3.10+
- A running vLLM service (e.g., `http://223.111.149.172:8000`)

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run the API Server
```bash
python src.app.py
```

Default address:
```
http://127.0.0.1:8000
```

### Run Console Mode
```bash
python src.console.py
```

This allows interactive testing with colored table output showing URL, score, summary, and decision.

### Environment Variables
```
VLLM_URL=http://223.111.149.172:8000
API_KEY=1234
```

## Project Structure
```
intelligenthub/
├── src/
│   ├── app.py
│   ├── console.py
│   ├── config.py
│   ├── processors.py
│   ├── vllm_client.py
│   └── utils.py
├── requirements.txt
├── README.md
└── .env.example
```

## Extension
You can replace the `vllm_client.py` to connect any OpenAI-compatible endpoint or extend `processors.py` to add more NLP logic.
