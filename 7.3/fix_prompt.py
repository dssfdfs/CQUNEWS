with open("src/api/deepseek.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig): Promise<{",
    "export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<{"
)

content = content.replace(
    "3. 轻量化标题：轻松活泼，吸引读者注意力\n\n${language === '中文' ? '请使用中文' : 'Please use English'}",
    "3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : ''}\n\n${language === '中文' ? '请使用中文' : 'Please use English'}"
)

with open("src/api/deepseek.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed customPrompt in generateTitles")
