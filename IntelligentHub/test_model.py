# test_model.py - 验证模型完整性
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import os

model_path = "./models/randeng_t5"
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"使用设备: {device}")
print(f"模型路径: {model_path}")

# 检查模型文件是否存在
required_files = ["config.json", "tokenizer_config.json", "special_tokens_map.json"]
missing_files = []
for f in required_files:
    if not os.path.exists(os.path.join(model_path, f)):
        missing_files.append(f)

# 检查模型权重文件
has_safetensors = os.path.exists(os.path.join(model_path, "model.safetensors"))
has_pytorch = os.path.exists(os.path.join(model_path, "pytorch_model.bin"))
if not has_safetensors and not has_pytorch:
    missing_files.append("model.safetensors 或 pytorch_model.bin")

if missing_files:
    print(f"\n❌ 缺少以下文件: {missing_files}")
    print("\n请从国内镜像下载: https://hf-mirror.com/IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese")
    print("需要下载的文件:")
    print("  - config.json")
    print("  - model.safetensors (约3GB) 或 pytorch_model.bin")
    print("  - tokenizer.json")
    print("  - tokenizer_config.json")
    print("  - special_tokens_map.json")
    print("  - vocab.txt 或 spiece.model")
    exit(1)

try:
    print("\n正在加载tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
    print("✅ tokenizer加载成功!")
    
    print("\n正在加载模型...")
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map="auto" if device == "cuda" else "cpu",
        local_files_only=True
    )
    print("✅ 模型加载成功!")
    
    # 测试摘要生成
    text = "湖南省生态环境厅官网更新显示，廖良辉已任厅党组书记。此前，湖南省委组织部发布公示，其中湘西州委副书记廖良辉拟进一步使用。"
    prompt = f"生成摘要：{text}"
    
    print(f"\n测试文本: {text}")
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    if device == "cuda":
        inputs = inputs.to(device)
    
    outputs = model.generate(**inputs, max_new_tokens=64, num_beams=4)
    summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"✅ 测试摘要: {summary}")
    
except Exception as e:
    print(f"\n❌ 模型加载失败: {e}")
    print("\n可能的原因:")
    print("  1. 模型文件不完整，请检查所有文件都已下载")
    print("  2. 文件路径不正确")
    print("  3. 模型文件损坏（重新下载）")