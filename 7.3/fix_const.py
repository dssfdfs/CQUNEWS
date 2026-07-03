with open("src/api/deepseek.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const userPrompt = `请对以下新闻内容进行${summaryType}：",
    "let userPrompt = `请对以下新闻内容进行${summaryType}："
)

with open("src/api/deepseek.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed const to let")
