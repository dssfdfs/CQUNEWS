const fs = require('fs');

let content = fs.readFileSync('src/api/deepseek.ts', 'utf-8');

content = content.replace(
  'export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig): Promise<string> {\n  const systemPrompt = `你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份${language === '中文' ? '中文' : 'English'}的${summaryType}。`;\n  \n  const userPrompt = `请对以下新闻内容进行${summaryType}：\n\n${content}\n\n要求：\n1. 准确概括新闻的核心内容\n2. 保持客观中立的立场\n3. 语言简洁明了\n4. ${language === '中文' ? '使用中文' : 'Use English'}`;',
  'export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<string> {\n  const systemPrompt = `你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份${language === '中文' ? '中文' : 'English'}的${summaryType}。`;\n  \n  const userPrompt = `请对以下新闻内容进行${summaryType}：\n\n${content}\n\n要求：\n1. 准确概括新闻的核心内容\n2. 保持客观中立的立场\n3. 语言简洁明了\n4. ${language === '中文' ? '使用中文' : 'Use English'}\n${customPrompt ? `\n额外要求：${customPrompt}` : ''}`;'
);

content = content.replace(
  'export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig): Promise<{\n  objective: string;\n  dataHighlight: string;\n  lightweight: string;\n}> {\n  const systemPrompt = `你是一个专业的新闻标题生成助手。请根据用户提供的新闻内容，生成三种不同风格的${language === '中文' ? '中文' : 'English'}标题。`;\n  \n  const userPrompt = `请为以下新闻内容生成三种不同风格的标题：\n\n${content}\n\n要求：\n1. 客观纪实型标题：准确反映新闻事实，简洁明了\n2. 数据亮点型标题：突出新闻中的关键数据或统计信息\n3. 轻量化标题：轻松活泼，吸引读者注意力\n\n${language === '中文' ? '请使用中文' : 'Please use English'}，每个标题一行，按顺序输出。`;',
  'export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<{\n  objective: string;\n  dataHighlight: string;\n  lightweight: string;\n}> {\n  const systemPrompt = `你是一个专业的新闻标题生成助手。请根据用户提供的新闻内容，生成三种不同风格的${language === '中文' ? '中文' : 'English'}标题。`;\n  \n  const userPrompt = `请为以下新闻内容生成三种不同风格的标题：\n\n${content}\n\n要求：\n1. 客观纪实型标题：准确反映新闻事实，简洁明了\n2. 数据亮点型标题：突出新闻中的关键数据或统计信息\n3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : ''}\n\n${language === '中文' ? '请使用中文' : 'Please use English'}，每个标题一行，按顺序输出。`;'
);

fs.writeFileSync('src/api/deepseek.ts', content, 'utf-8');
console.log('Updated deepseek.ts with custom prompt support');
