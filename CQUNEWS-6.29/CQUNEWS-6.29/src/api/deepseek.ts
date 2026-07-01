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

export async function generateSummary(content: string, summaryType: string, language: string): Promise<string> {
  const result = await callApi<{ summary: string }>('/process/summary', {
    content,
    summaryType,
    language,
    model: 'DeepSeek',
  });
  return result.summary;
}

export async function generateTitles(content: string, language: string): Promise<{
  objective: string;
  dataHighlight: string;
  lightweight: string;
}> {
  const result = await callApi<{
    objective: string;
    dataHighlight: string;
    lightweight: string;
  }>('/process/titles', {
    content,
    language,
    model: 'DeepSeek',
  });
  return result;
}

export async function verifyQuality(content: string): Promise<{
  coverageRate: number;
  titleDeviation: number;
  hallucinationCount: number;
}> {
  const result = await callApi<{
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  }>('/process/quality', {
    content,
    model: 'DeepSeek',
  });
  return result;
}

export async function generateAll(content: string, summaryType: string, language: string): Promise<{
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
  const result = await callApi<{
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
  }>('/process/all', {
    content,
    summaryType,
    language,
    model: 'DeepSeek',
  });
  return result;
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

export async function register(username: string, _email: string, password: string, captcha: string, sessionKey: string): Promise<{
  id: number;
  username: string;
  role: string;
}> {
  const result = await callApi<{
    id: number;
    username: string;
    role: string;
  }>('/auth/register', {
    username,
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