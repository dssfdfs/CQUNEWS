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