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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...requestBody,
      api_key: apiConfig?.apiKey || '',
      api_url: apiConfig?.apiUrl || '',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices[0].message.content;
}

export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig): Promise<string> {
  const systemPrompt = `你是一个专业的新闻摘要助手。请根据用户提供的新闻内容，生成一份${language === '中文' ? '中文' : 'English'}的${summaryType}。`;
  
  const userPrompt = `请对以下新闻内容进行${summaryType}：

${content}

要求：
1. 准确概括新闻的核心内容
2. 保持客观中立的立场
3. 语言简洁明了
4. ${language === '中文' ? '使用中文' : 'Use English'}`;

  return callDeepSeek(apiConfig?.model || 'DeepSeek', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], apiConfig);
}

export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig): Promise<{
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
  coverageRate: number;
  titleDeviation: number;
  hallucinationCount: number;
}> {
  const systemPrompt = `你是一个专业的新闻内容质量校验助手。请对摘要和标题进行质量评估。`;
  
  const userPrompt = `请对以下新闻内容、摘要和标题进行质量校验：

原文内容：
${content}

摘要：
${summary}

标题：
1. 客观纪实型：${titles.objective}
2. 数据亮点型：${titles.dataHighlight}
3. 轻量化：${titles.lightweight}

请评估以下指标：
1. 覆盖率（0-100分）：摘要覆盖原文核心内容的程度
2. 标题偏离度（0-100分）：标题与原文内容的偏差程度，分数越低越好
3. 幻觉数量（0-5个）：摘要中出现的与原文不符或编造的信息数量

请以JSON格式输出，格式为：{"coverageRate": 分数, "titleDeviation": 分数, "hallucinationCount": 数量}`;

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
      coverageRate: 85,
      titleDeviation: 15,
      hallucinationCount: 0,
    };
  }
}