# Randeng-T5 模型下载指南

## 国内镜像下载（无需翻墙）

请从以下国内镜像站下载模型文件：
👉 https://hf-mirror.com/IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese

## 必须下载的 6 个核心文件

点击页面上的 "Files and versions" 标签，逐个下载以下文件：

| 文件名 | 作用 | 大小 |
|--------|------|------|
| config.json | 模型配置文件 | ~1KB |
| model.safetensors | 模型权重文件（推荐） | ~3GB |
| tokenizer.json | 分词器核心文件 | ~2.5MB |
| tokenizer_config.json | 分词器配置 | ~1KB |
| special_tokens_map.json | 特殊符号映射 | ~1KB |
| vocab.txt 或 spiece.model | 词表文件 | ~2MB |

## 存放路径

将所有下载的文件放入项目的 `models/randeng_t5` 目录：

```
CQUNEWS/
├─ models/
│  └─ randeng_t5/
│     ├─ config.json
│     ├─ model.safetensors
│     ├─ tokenizer.json
│     ├─ tokenizer_config.json
│     ├─ special_tokens_map.json
│     └─ vocab.txt (或 spiece.model)
└─ ...其他项目文件
```

## 验证模型完整性

下载完成后，运行以下命令验证：

```powershell
python test_model.py
```

成功输出示例：
```
✅ tokenizer加载成功!
✅ 模型加载成功!
✅ 测试摘要: 湖南省生态环境厅更新领导信息，廖良辉任厅党组书记
```

## 常见问题

### 1. 文件下载不完整
- model.safetensors 必须在 2.8GB~3.2GB 之间
- 如果文件只有几KB，说明下载的是网页HTML，不是模型文件

### 2. 模型太大下载慢
可以使用更小的版本：
👉 https://hf-mirror.com/IDEA-CCNL/Randeng-T5-239M-Summary-Chinese

### 3. 只有CPU没有GPU
代码已自动处理，会使用CPU推理（速度慢但功能正常）

## 下载完成后

刷新页面即可生效，项目会自动加载本地模型，不再尝试联网下载。