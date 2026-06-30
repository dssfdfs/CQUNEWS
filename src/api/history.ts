interface Titles {
  objective: string;
  dataHighlight: string;
  lightweight: string;
}

interface Quality {
  coverageRate: number;
  titleDeviation: number;
  hallucinationCount: number;
}

export interface HistoryItem {
  id: number;
  user_id: number;
  content: string;
  summary: string;
  titles: Titles;
  quality: Quality | null;
  created_at: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HistoryCreateRequest {
  content: string;
  summary: string;
  titles: Titles;
  quality?: Quality;
}

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createHistory(data: HistoryCreateRequest): Promise<HistoryItem> {
  const response = await fetch(`${API_BASE}/history/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create history');
  }
  return response.json();
}

export async function getHistoryList(page: number = 1, pageSize: number = 10): Promise<HistoryListResponse> {
  const response = await fetch(`${API_BASE}/history/?page=${page}&page_size=${pageSize}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }
  return response.json();
}

export async function getHistoryById(id: number): Promise<HistoryItem> {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch history item');
  }
  return response.json();
}

export async function deleteHistory(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete history');
  }
}