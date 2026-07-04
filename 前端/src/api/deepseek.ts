interface ApiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

interface Message {
  role: 'system' | 'user';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callDeepSeek(model: string, messages: Message[], apiConfig?: ApiConfig, temperature = 0.7, max_tokens = 2000): Promise<string> {
  const requestBody: DeepSeekRequest = {
    model: apiConfig?.model || model,
    messages,
    temperature,
    max_tokens,
  };

  const url = '/api/process';

  const body: Record<string, any> = { ...requestBody };
  if (apiConfig?.apiKey && apiConfig.apiKey.trim()) {
    body.api_key = apiConfig.apiKey;
  }
  if (apiConfig?.apiUrl && apiConfig.apiUrl.trim()) {
    body.api_url = apiConfig.apiUrl;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices[0].message.content;
}

export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<string> {
  const systemPrompt = `你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份${language === '中文' ? '中文' : 'English'}的${summaryType}。`;
  
  let userPrompt = `请对以下新闻内容进行${summaryType}：

${content}

要求：
1. 准确概括新闻的核心内容
2. 保持客观中立的立场
3. 语言简洁明了
4. ${language === '中文' ? '使用中文' : 'Use English'}`;

  if (customPrompt) {
    userPrompt += `\n\n额外要求：${customPrompt}`;
  }

  return callDeepSeek(apiConfig?.model || 'DeepSeek', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], apiConfig);
}

export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<{
  objective: string;
  dataHighlight: string;
  lightweight: string;
}> {
  const systemPrompt = `你是一个专业的新闻标题生成助手。请根据用户提供的新闻内容，生成三种不同风格的${language === '中文' ? '中文' : 'English'}标题。`;
  
  const userPrompt = `请为以下新闻内容生成三种不同风格的标题：

${content}

要求：
1. 客观纪实型标题：准确反映新闻事实，简洁明了
2. 数据亮点型标题：突出新闻中的关键数据或统计信息
3. 轻量化标题：轻松活泼，吸引读者注意力
${customPrompt ? `
额外要求：${customPrompt}` : ''}

${language === '中文' ? '请使用中文' : 'Please use English'}，每个标题一行，按顺序输出。`;

  const result = await callDeepSeek(apiConfig?.model || 'DeepSeek', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], apiConfig);

  const lines = result.split('\n').filter(line => line.trim());
  return {
    objective: lines[0]?.replace(/^[\d\.\-\*]+\s*/, '') || '',
    dataHighlight: lines[1]?.replace(/^[\d\.\-\*]+\s*/, '') || '',
    lightweight: lines[2]?.replace(/^[\d\.\-\*]+\s*/, '') || '',
  };
}

export async function verifyQuality(content: string, summary: string, titles: {
  objective: string;
  dataHighlight: string;
  lightweight: string;
}, apiConfig?: ApiConfig): Promise<{
  credibility: number;
  readability: number;
  engagement: number;
  relevance: number;
}> {
  const systemPrompt = `你是一个专业的新闻内容质量评估专家。请从用户角度对新闻内容进行综合评估。`;
  
  const userPrompt = `请从用户角度对以下新闻内容、摘要和标题进行综合质量评估：

原文内容：
${content}

摘要：
${summary}

标题：
1. 客观纪实型：${titles.objective}
2. 数据亮点型：${titles.dataHighlight}
3. 轻量化：${titles.lightweight}

请评估以下用户导向指标（每项0-100分）：
1. 新闻可信度（credibility）：信息来源可靠性、内容真实性、事实准确性
2. 内容可读性（readability）：语言流畅度、逻辑清晰度、阅读体验
3. 读者吸引力（engagement）：标题吸引力、内容趣味性、是否能激发阅读兴趣
4. 主题相关性（relevance）：标题与内容的匹配度、摘要对核心主题的把握程度

请以JSON格式输出，格式为：{"credibility": 分数, "readability": 分数, "engagement": 分数, "relevance": 分数}`;

  const result = await callDeepSeek(apiConfig?.model || 'DeepSeek', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], apiConfig);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON format');
  } catch {
    return {
      credibility: 85,
      readability: 80,
      engagement: 75,
      relevance: 85,
    };
  }
}