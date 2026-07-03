with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "isGenerating: boolean;\n  history: HistoryItem[];",
    "isGenerating: boolean;\n  customPrompt: string;\n  history: HistoryItem[];"
)

content = content.replace(
    "setIsGenerating: (isGenerating: boolean) => void;\n  addHistory:",
    "setIsGenerating: (isGenerating: boolean) => void;\n  setCustomPrompt: (customPrompt: string) => void;\n  addHistory:"
)

with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed NewsState interface")
