const getAdminToken = () => {
  return localStorage.getItem('admin_token');
};

const adminHeaders = () => {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface AnalyticsSummary {
  total_users: number;
  today_active_users: number;
  today_generate_count: number;
  pending_feedback: number;
}

export interface UserBehaviorData {
  dau: Array<{ name: string; value: number }>;
  action_distribution: Array<{ name: string; value: number }>;
  avg_duration: number;
  duration_distribution: Array<{ name: string; value: number }>;
  total_records: number;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  last_login_at: string | null;
  total_actions: number;
  last_active: string | null;
}

export interface UserHistoryItem {
  id: number;
  action_type: string;
  action_label: string;
  target_id: number | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface FeedbackItem {
  id: number;
  user_id: number;
  username: string;
  email: string;
  content: string;
  contact_info: string | null;
  status: string;
  created_at: string;
}

export interface ApiKeyResponse {
  api_key: string;
}

export interface WordCloudData {
  words: Array<{
    text: string;
    value: number;
    category: string;
  }>;
}

export interface HeatmapData {
  heatmap: Array<{
    weekday: string;
    hour: number;
    value: number;
  }>;
  weekdays: string[];
  hours: number[];
}

export interface NewsItem {
  id: number;
  title: string;
  source: string | null;
  category: string | null;
  quality_score: number;
  review_status: string;
  review_note: string | null;
  crawl_status: number;
  views: number;
  created_at: string;
  published_at: string | null;
}

export interface NewsDetail extends NewsItem {
  summary: string | null;
  content: string | null;
  original_url: string;
  is_trending: number;
  updated_at: string | null;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export const adminApi = {
  login: async (username: string, password: string) => {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

  getMe: async () => {
    const response = await fetch('/api/admin/auth/me', {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const response = await fetch('/api/admin/analytics/summary', {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getUserBehavior: async (startDate?: string, endDate?: string): Promise<UserBehaviorData> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await fetch(`/api/admin/analytics/user-behavior?${params}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getWordCloud: async (days: number = 7): Promise<WordCloudData> => {
    const response = await fetch(`/api/admin/analytics/word-cloud?days=${days}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getHeatmap: async (days: number = 7): Promise<HeatmapData> => {
    const response = await fetch(`/api/admin/analytics/heatmap?days=${days}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getUsers: async (search?: string): Promise<{ users: UserInfo[] }> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const response = await fetch(`/api/admin/users?${params}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getUserHistory: async (userId: number): Promise<{ history: UserHistoryItem[] }> => {
    const response = await fetch(`/api/admin/users/${userId}/history`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getDefaultApiKey: async (): Promise<ApiKeyResponse> => {
    const response = await fetch('/api/admin/config/default-api-key', {
      headers: adminHeaders(),
    });
    return response.json();
  },

  updateDefaultApiKey: async (apiKey: string): Promise<ApiKeyResponse> => {
    const response = await fetch('/api/admin/config/default-api-key', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ api_key: apiKey }),
    });
    return response.json();
  },

  getFeedback: async (status?: string): Promise<{ feedbacks: FeedbackItem[] }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await fetch(`/api/admin/feedback?${params}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  resolveFeedback: async (feedbackId: number): Promise<FeedbackItem> => {
    const response = await fetch(`/api/admin/feedback/${feedbackId}/resolve`, {
      method: 'PUT',
      headers: adminHeaders(),
    });
    return response.json();
  },

  exportUsers: async () => {
    const response = await fetch('/api/admin/export/users', {
      headers: adminHeaders(),
    });
    if (!response.ok) {
      throw new Error('导出失败');
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition?.match(/filename=(.+)/)?.[1] || 'backup.db';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  analyzeUrl: async (url: string) => {
    const response = await fetch('/api/admin/analyze/url', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ url }),
    });
    return response.json();
  },

  getContentList: async (
    status?: string,
    search?: string,
    page: number = 1,
    page_size: number = 20
  ): Promise<PaginatedResponse<NewsItem>> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('page_size', page_size.toString());
    const response = await fetch(`/api/admin/content?${params}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  getContentDetail: async (newsId: number): Promise<NewsDetail> => {
    const response = await fetch(`/api/admin/content/${newsId}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  approveContent: async (newsId: number, note?: string) => {
    const response = await fetch(`/api/admin/content/${newsId}/approve`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: note ? JSON.stringify({ note }) : undefined,
    });
    return response.json();
  },

  rejectContent: async (newsId: number, note: string) => {
    const response = await fetch(`/api/admin/content/${newsId}/reject`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ note }),
    });
    return response.json();
  },

  getLogs: async (
    search?: string,
    action?: string,
    page: number = 1,
    page_size: number = 20
  ): Promise<PaginatedResponse<AuditLogItem>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (action) params.append('action', action);
    params.append('page', page.toString());
    params.append('page_size', page_size.toString());
    const response = await fetch(`/api/admin/logs?${params}`, {
      headers: adminHeaders(),
    });
    return response.json();
  },

  testApi: async (apiKey: string) => {
    const response = await fetch('/api/admin/config/test-api', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ api_key: apiKey }),
    });
    return response.json();
  },
};