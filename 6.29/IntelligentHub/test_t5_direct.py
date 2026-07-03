from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

model_path = "./models/randeng_t5"

print("正在加载模型...")
tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
model = AutoModelForSeq2SeqLM.from_pretrained(
    model_path,
    local_files_only=True,
    low_cpu_mem_usage=True
)

print("✅ 模型加载成功!")

test_text = "湖南省生态环境厅官网更新显示，廖良辉已任厅党组书记。此前，湖南省委组织部发布公示，其中湘西州委副书记廖良辉拟进一步使用。"

print(f"\n测试文本: {test_text}")

# 使用正确的提示格式
input_text = f"生成摘要：{test_text}"
inputs = tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True)

print("\n正在生成摘要...")
outputs = model.generate(
    inputs.input_ids,
    max_new_tokens=100,
    num_beams=4,
    early_stopping=True
)

summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
print(f"\n✅ 生成的摘要: {summary}")

# 验证摘要质量
if "廖良辉" in summary:
    print("✅ 摘要包含关键人物信息")
else:
    print("❌ 摘要缺少关键人物信息")

if "党组书记" in summary or "厅" in summary:
    print("✅ 摘要包含关键职位信息")
else:
    print("❌ 摘要缺少关键职位信息")