with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("customPrompt: ,", "customPrompt: \"\",")
with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)
