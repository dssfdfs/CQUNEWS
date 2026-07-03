with open("src/api/deepseek.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig): Promise<string> {",
    "export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<string> {"
)

content = content.replace(
    "4. ${language === '中文' ? '使用中文' : 'Use English'}`,",
    "4. ${language === '中文' ? '使用中文' : 'Use English'}`;"
)

content = content.replace(
    "4. ${language === '中文' ? '使用中文' : 'Use English'}`;\n\n  return callDeepSeek(",
    "4. ${language === '中文' ? '使用中文' : 'Use English'}`;\n\n  if (customPrompt) {\n    userPrompt += `\\n\\n额外要求：${customPrompt}`;\n  }\n\n  return callDeepSeek("
)

with open("src/api/deepseek.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed customPrompt in generateSummary")
