import os

with open("src/api/deepseek.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("3. 轻量化标题：轻松活泼，吸引读者注意力\n\n${language ===", "3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : ""} \n\n${language ===")

with open("src/api/deepseek.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed deepseek.ts")

