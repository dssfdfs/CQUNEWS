with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 添加customPrompt状态和setCustomPrompt方法
content = content.replace(
    "isGenerating: false,\n  history: initialHistory,",
    "isGenerating: false,\n  customPrompt: "",\n  history: initialHistory,"
)

# 添加setCustomPrompt方法
content = content.replace(
    "setIsGenerating: (isGenerating) => set({ isGenerating }),\n  addHistory",
    "setIsGenerating: (isGenerating) => set({ isGenerating }),\n  setCustomPrompt: (customPrompt) => set({ customPrompt }),\n  addHistory"
)

# 添加类型注解
content = content.replace(
    "const loadHistoryFromStorage = (userId) => {",
    "const loadHistoryFromStorage = (userId: string | null) => {"
)

content = content.replace(
    "return history.map((item) => ({",
    "return history.map((item: any) => ({"
)

content = content.replace(
    "const saveHistoryToStorage = (userId, history) => {",
    "const saveHistoryToStorage = (userId: string | null, history: HistoryItem[]) => {"
)

with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed TypeScript errors")
