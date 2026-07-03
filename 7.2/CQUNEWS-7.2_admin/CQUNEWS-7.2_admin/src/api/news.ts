export interface NewsItem {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  source: string | null;
  original_url: string;
  published_at: string | null;
  views: number;
  is_trending: boolean;
  created_at: string | null;
}

export interface NewsListResponse {
  total: number;
  page: number;
  page_size: number;
  items: NewsItem[];
}

export interface StatsResponse {
  total_news: number;
  trending_news: number;
  sources: number;
  crawl_runs: number;
  latest_news: NewsItem | null;
}

export interface CrawlRunResponse {
  triggered: boolean;
  message: string;
  started_at: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchNews(
  page = 1,
  pageSize = 12,
  params: { category?: string; source?: string; keyword?: string; trending_only?: boolean; ids?: number[] } = {}
): Promise<NewsListResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (params.category) qs.set('category', params.category);
  if (params.source) qs.set('source', params.source);
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.trending_only) qs.set('trending_only', 'true');
  if (params.ids && params.ids.length > 0) {
    params.ids.forEach((id) => qs.append('ids', String(id)));
  }
  const res = await fetch(`/api/news?${qs.toString()}`);
  return handleResponse<NewsListResponse>(res);
}

export async function fetchNewsDetail(id: number): Promise<NewsItem> {
  const res = await fetch(`/api/news/${id}`);
  return handleResponse<NewsItem>(res);
}

export async function fetchCategories(): Promise<{ categories: string[] }> {
  const res = await fetch('/api/categories');
  return handleResponse<{ categories: string[] }>(res);
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch('/api/stats');
  return handleResponse<StatsResponse>(res);
}

export async function triggerCrawl(): Promise<CrawlRunResponse> {
  const res = await fetch('/api/crawl/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse<CrawlRunResponse>(res);
}
