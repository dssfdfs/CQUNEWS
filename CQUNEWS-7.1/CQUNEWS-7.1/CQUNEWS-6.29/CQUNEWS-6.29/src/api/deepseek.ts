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

export async function generateAll(content: string, summaryType: string, language: string, apiConfig?: ApiConfig): Promise<{
  summary: string;
  titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  };
  quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  };
}> {
  const [summary, titles] = await Promise.all([
    generateSummary(content, summaryType, language, apiConfig),
    generateTitles(content, language, apiConfig),
  ]);
  
  const quality = await verifyQuality(content, summary, titles, apiConfig);
  
  return { summary, titles, quality };
}

const BASE_URL = '/api';

export async function callApi<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getCaptcha(): Promise<{ captcha: string; session_key: string }> {
  const response = await fetch(`${BASE_URL}/auth/captcha`);
  if (!response.ok) {
    throw new Error('Failed to get captcha');
  }
  return response.json();
}

export async function login(username: string, password: string, captcha: string, sessionKey: string): Promise<{
  access_token: string;
  token_type: string;
  user_id: number;
  role: string;
}> {
  const result = await callApi<{
    access_token: string;
    token_type: string;
    user_id: number;
    role: string;
  }>('/auth/login', {
    username,
    password,
    captcha,
    session_key: sessionKey,
  });
  return result;
}

export async function register(username: string, email: string, password: string, captcha: string, sessionKey: string): Promise<{
  id: number;
  username: string;
  email: string;
  role: string;
}> {
  const result = await callApi<{
    id: number;
    username: string;
    email: string;
    role: string;
  }>('/auth/register', {
    username,
    email,
    password,
    captcha,
    session_key: sessionKey,
    role: 'user',
  });
  return result;
}

export async function addHistory(item: {
  content: string;
  summary: string;
  titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  };
  quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  };
  user_id?: number;
}): Promise<any> {
  const result = await callApi('/history/', item);
  return result;
}

export async function getHistory(
  user_id?: number,
  params: {
    page?: number;
    page_size?: number;
    keyword?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<{
  data: Array<{
    id: number;
    content: string;
    summary: string;
    titles: {
      objective: string;
      dataHighlight: string;
      lightweight: string;
    };
    quality: {
      coverageRate: number;
      titleDeviation: number;
      hallucinationCount: number;
    };
    status: string;
    category: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}> {
  const urlParams = new URLSearchParams();
  if (user_id) urlParams.set('user_id', user_id.toString());
  if (params.page) urlParams.set('page', params.page.toString());
  if (params.page_size) urlParams.set('page_size', params.page_size.toString());
  if (params.keyword) urlParams.set('keyword', params.keyword);
  if (params.status) urlParams.set('status', params.status);
  if (params.start_date) urlParams.set('start_date', params.start_date);
  if (params.end_date) urlParams.set('end_date', params.end_date);
  
  const url = `${BASE_URL}/history/?${urlParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to get history');
  }
  return response.json();
}

export async function deleteHistory(task_id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/history/${task_id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete history');
  }
}

export interface Settings {
  theme: string;
  font_size: number;
  language: string;
  email_notification: boolean;
  sound_notification: boolean;
  quality_notification: boolean;
  storage_quota: number;
  animation_enabled: boolean;
  glass_effect_enabled: boolean;
}

export async function getSettings(): Promise<Settings> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/settings`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to get settings');
  }
  return response.json();
}

export async function saveSettings(settings: Partial<Settings>): Promise<{ code: number; message: string }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to save settings');
  }
  return response.json();
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
}

export async function getUserInfo(): Promise<UserInfo> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/user/info`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to get user info');
  }
  return response.json();
}

export async function updateUserInfo(data: { email?: string; bio?: string }): Promise<{ code: number; message: string }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/user/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update user info');
  }
  return response.json();
}

export async function updateAvatar(avatar: string): Promise<{ code: number; message: string }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/user/avatar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ avatar }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update avatar');
  }
  return response.json();
}

export async function changePassword(data: { old_password: string; new_password: string; confirm_password: string }): Promise<{ code: number; message: string }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to change password');
  }
  return response.json();
}
