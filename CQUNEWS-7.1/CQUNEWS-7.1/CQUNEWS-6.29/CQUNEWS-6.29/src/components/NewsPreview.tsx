import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Eye,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { fetchNews, triggerCrawl, type NewsItem } from '@/api/news';

const CATEGORIES = [
  '全部',
  '国际',
  '时政',
  '科技',
  '财经',
  '体育',
  '娱乐',
  '健康',
  '综合',
  '我的收藏',
] as const;

const BOOKMARK_STORAGE_KEY = 'cqunews:bookmarks';

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.replace('T', ' ').slice(0, 16);
}

function loadBookmarksFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr.filter((n) => typeof n === 'number'));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveBookmarksToStorage(ids: Set<number>) {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function NewsPreview() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<number>>(() => loadBookmarksFromStorage());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const latestFetchId = useRef(0);

  useEffect(() => {
    saveBookmarksToStorage(bookmarked);
  }, [bookmarked]);

  const loadNews = async (p = 1, cat = selectedCategory, kw = searchQuery) => {
    setLoading(true);
    setError('');
    const fetchId = ++latestFetchId.current;
    try {
      if (cat === '我的收藏') {
        if (bookmarked.size === 0) {
          if (fetchId !== latestFetchId.current) return;
          setNews([]);
          setTotal(0);
          setPage(1);
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
        const params: { keyword?: string; ids?: number[] } = { ids: Array.from(bookmarked) };
        if (kw.trim()) params.keyword = kw.trim();
        const data = await fetchNews(p, pageSize, params);
        if (fetchId !== latestFetchId.current) return;
        setNews(data.items);
        setTotal(data.total);
        setPage(data.page);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      const params: { category?: string; keyword?: string } = {};
      if (cat !== '全部') params.category = cat;
      if (kw.trim()) params.keyword = kw.trim();
      const data = await fetchNews(p, pageSize, params);
      if (fetchId !== latestFetchId.current) return;
      setNews(data.items);
      setTotal(data.total);
      setPage(p);
      setLastUpdated(new Date());
    } catch (err) {
      if (fetchId !== latestFetchId.current) return;
      setError(err instanceof Error ? err.message : '加载新闻失败');
    } finally {
      if (fetchId === latestFetchId.current) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await triggerCrawl();
      await loadNews(1, selectedCategory, searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews(1, selectedCategory, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => loadNews(1, selectedCategory, searchQuery), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadNews(p, selectedCategory, searchQuery);
  };

  const toggleBookmark = (id: number) => {
    let willUnbookmark = false;
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        willUnbookmark = true;
      } else {
        next.add(id);
      }
      return next;
    });
    if (selectedCategory === '我的收藏' && willUnbookmark) {
      setNews((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setPage((p) => {
        const nextPage = Math.max(1, p);
        return nextPage;
      });
    }
  };

  const displayNews = news;
  const displayTotal = total;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">今日新闻速览</h1>
          <p className="text-gray-500 mt-1">
            实时获取最新热点资讯
            {lastUpdated && (
              <span className="ml-3 text-xs text-gray-400">
                更新时间：{formatTime(lastUpdated.toISOString())}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            热点 {displayTotal}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '抓取中...' : '刷新新闻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">加载出错</div>
            <div className="text-sm">{error}</div>
          </div>
          <button
            onClick={() => loadNews()}
            className="text-sm text-primary-700 hover:underline"
          >
            重试
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索新闻标题或摘要..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const isFav = cat === '我的收藏';
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : isFav
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isFav ? (
                    <BookmarkCheck className="w-3.5 h-3.5" />
                  ) : null}
                  {cat}
                  {isActive && !isFav ? null : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-full bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-5/6 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-4/6 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-1/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : displayNews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {selectedCategory === '我的收藏' ? (
            <>
              <Bookmark className="w-16 h-16 mx-auto mb-4" />
              <p>还没有收藏的新闻</p>
              <p className="text-sm mt-1">在新闻卡片上点击书签图标即可收藏，便于后续查看</p>
            </>
          ) : (
            <>
              <Search className="w-16 h-16 mx-auto mb-4" />
              <p>暂无相关新闻</p>
              <p className="text-sm mt-1">请尝试其他分类或点击"刷新新闻"立即抓取</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            {displayNews.map((item) => {
              const isFav = bookmarked.has(item.id);
              return (
                <div
                  key={item.id}
                  className="card p-5 hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {item.is_trending ? (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                          热门
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          最新
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {item.category || '未分类'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(item.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFav
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-400 hover:text-yellow-600'
                      }`}
                      title={isFav ? '取消收藏' : '收藏'}
                    >
                      <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <a
                    href={item.original_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 block"
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                      {item.summary || (item.content ? item.content.slice(0, 150) : '')}
                    </p>
                  </a>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {item.source && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {item.source}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.views.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.published_at)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCategory !== '我的收藏' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500">
                第 {page} / {totalPages} 页（共 {displayTotal} 条）
              </span>
              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
