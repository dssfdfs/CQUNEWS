import os
import ssl

# 禁用SSL验证（仅用于下载模型）
ssl._create_default_https_context = ssl._create_unverified_context

from transformers import T5Tokenizer, T5ForConditionalGeneration

# 创建模型目录
os.makedirs("models/randeng_t5", exist_ok=True)

print("开始下载模型...")
print("这可能需要几分钟时间，取决于网络速度")

try:
    # 使用清华镜像
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
    
    print("正在下载tokenizer...")
    tokenizer = T5Tokenizer.from_pretrained(
        "IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese"
    )
    tokenizer.save_pretrained("models/randeng_t5")
    
    print("正在下载模型...")
    model = T5ForConditionalGeneration.from_pretrained(
        "IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese"
    )
    model.save_pretrained("models/randeng_t5")
    
    print("模型下载完成!")
except Exception as e:
    print(f"下载失败: {e}")
    print("\n备选方案：您可以手动下载模型")
    print("1. 访问: https://huggingface.co/IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese")
    print("2. 点击 'Files and versions' 标签")
    print("3. 下载所有文件到 models/randeng_t5 目录")
