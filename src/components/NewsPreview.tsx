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
  FileText,
  X,
  Mic,
  Volume2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { fetchNews, triggerCrawl, type NewsItem } from '@/api/news';

const SUMMARY_CACHE_KEY = 'cqunews:ai_summaries';

function loadSummaryCache(): Record<number, string> {
  try {
    const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSummaryCache(cache: Record<number, string>) {
  try {
    localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

async function generateSummaryFromBackend(newsId: number): Promise<string | null> {
  try {
    const response = await fetch(`/api/news/${newsId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (data.success && data.summary) {
      return data.summary;
    }
    return null;
  } catch {
    return null;
  }
}

const CATEGORIES = [
  '推荐',
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
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('推荐');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<number>>(() => loadBookmarksFromStorage());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'summary' | 'full'>('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [aiSummaryCache, setAiSummaryCache] = useState<Record<number, string>>(() => loadSummaryCache());
  const [generatingSummaryIds, setGeneratingSummaryIds] = useState<Set<number>>(new Set());
  const latestFetchId = useRef(0);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const getSummaryForNews = (item: NewsItem): string => {
    if (!item) return '';
    if (aiSummaryCache[item.id]) {
      return aiSummaryCache[item.id];
    }
    if (item.summary) {
      return item.summary;
    }
    return item.content ? item.content.slice(0, 150) : '';
  };

  const hasAIEnhancedSummary = (item: NewsItem): boolean => {
    return !!item && !!aiSummaryCache[item.id];
  };

  useEffect(() => {
    saveSummaryCache(aiSummaryCache);
  }, [aiSummaryCache]);

  useEffect(() => {
    saveBookmarksToStorage(bookmarked);
  }, [bookmarked]);

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

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

      if (cat === '推荐') {
        const params: { trending_only?: boolean; keyword?: string } = { trending_only: true };
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

  const estimatedReadingTime = useMemo(() => {
    if (!selectedNews) return 0;
    const text = voiceMode === 'summary'
      ? getSummaryForNews(selectedNews)
      : selectedNews.content || selectedNews.summary || '';
    const charCount = text.length;
    const charsPerSecond = 4;
    return Math.max(1, Math.ceil(charCount / charsPerSecond));
  }, [selectedNews, voiceMode, selectedNews?.id && aiSummaryCache[selectedNews.id]]);

  useEffect(() => {
    if (!isPlaying) {
      setReadingProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setReadingProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 0;
        }
        return prev + (100 / (estimatedReadingTime * 10));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, estimatedReadingTime]);

  useEffect(() => {
    if (!isPlaying) return;

    const chromeFixInterval = setInterval(() => {
      window.speechSynthesis.pause();
      setTimeout(() => {
        window.speechSynthesis.resume();
      }, 100);
    }, 12000);

    return () => clearInterval(chromeFixInterval);
  }, [isPlaying]);

  useEffect(() => {
    setShowVoiceMenu(false);
    stopSpeak();
  }, [selectedNews]);

  useEffect(() => {
    return () => {
      stopSpeak();
    };
  }, []);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadNews(p, selectedCategory, searchQuery);
  };

  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setReadingProgress(0);
  };

  const speak = (mode: 'summary' | 'full') => {
    if (!selectedNews) return;

    stopSpeak();

    const text = mode === 'summary'
      ? getSummaryForNews(selectedNews)
      : selectedNews.content || selectedNews.summary || '';

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;

    const voices = voicesRef.current;
    const zhVoice = voices.find(v => v.lang.includes('zh')) || voices.find(v => v.lang.includes('zh-CN')) || voices[0];
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setReadingProgress(0);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setReadingProgress(0);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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

  const handleGenerateAISummary = async (newsId: number) => {
    if (generatingSummaryIds.has(newsId)) return;
    setGeneratingSummaryIds((prev) => new Set(prev).add(newsId));
    try {
      const summary = await generateSummaryFromBackend(newsId);
      if (summary) {
        setAiSummaryCache((prev) => ({ ...prev, [newsId]: summary }));
        setNews((prev) =>
          prev.map((item) =>
            item.id === newsId ? { ...item, summary } : item
          )
        );
        if (selectedNews?.id === newsId) {
          setSelectedNews((prev) => prev ? { ...prev, summary } : null);
        }
      }
    } catch {
      // ignore
    } finally {
      setGeneratingSummaryIds((prev) => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
    }
  };

  const displayNews = news;
  const displayTotal = total;

  return (
    <div className="p-6 flex gap-6">
      <div className={`flex-1 ${showSummaryPanel ? 'max-w-[66.66%]' : ''}`}>
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
              const isRecommended = cat === '推荐';
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : isRecommended
                        ? 'bg-pink-100 text-red-600 hover:bg-pink-200'
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
          <div className={`grid gap-6 ${showSummaryPanel ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (showSummaryPanel && selectedNews?.id === item.id) {
                              setShowSummaryPanel(false);
                              setSelectedNews(null);
                            } else {
                              setSelectedNews(item);
                              setShowSummaryPanel(true);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            showSummaryPanel && selectedNews?.id === item.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-400 hover:text-blue-600'
                          }`}
                          title={showSummaryPanel && selectedNews?.id === item.id ? '关闭摘要' : '查看摘要'}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {!hasAIEnhancedSummary(item) && !item.summary && item.content && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleGenerateAISummary(item.id);
                            }}
                            disabled={generatingSummaryIds.has(item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              generatingSummaryIds.has(item.id)
                                ? 'bg-gray-100 text-gray-300'
                                : 'bg-purple-50 text-purple-500 hover:bg-purple-100 hover:text-purple-600'
                            }`}
                            title={generatingSummaryIds.has(item.id) ? '生成中...' : '生成AI摘要'}
                          >
                            {generatingSummaryIds.has(item.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </button>
                        )}
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
                      {getSummaryForNews(item)}
                      {hasAIEnhancedSummary(item) && (
                        <span className="inline-flex items-center gap-0.5 ml-1 text-xs text-purple-500">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
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

      {showSummaryPanel && selectedNews && (
        <div className="w-[33.33%] sticky top-6 h-fit">
          <div className="card p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">新闻摘要</h2>
              </div>
              <button
                onClick={() => {
                  setShowSummaryPanel(false);
                  setSelectedNews(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="关闭摘要"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {selectedNews.is_trending ? (
                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                    热门
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    最新
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {selectedNews.category || '未分类'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-800 leading-relaxed">
                {selectedNews.title}
              </h3>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                {selectedNews.source && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    {selectedNews.source}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {selectedNews.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedNews.published_at)}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">摘要内容</h4>
                  {hasAIEnhancedSummary(selectedNews) && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-purple-500">
                      <Sparkles className="w-3 h-3" />
                      AI 智能摘要
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {getSummaryForNews(selectedNews) || '暂无摘要内容'}
                </p>
                {!hasAIEnhancedSummary(selectedNews) && !selectedNews.summary && selectedNews.content && (
                  <button
                    onClick={() => handleGenerateAISummary(selectedNews.id)}
                    disabled={generatingSummaryIds.has(selectedNews.id)}
                    className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      generatingSummaryIds.has(selectedNews.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    {generatingSummaryIds.has(selectedNews.id) ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        生成 AI 摘要
                      </>
                    )}
                  </button>
                )}
              </div>

              {selectedNews.content && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">完整内容</h4>
                  <div className="text-gray-600 text-sm leading-relaxed max-h-64 overflow-y-auto">
                    {selectedNews.content}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <a
                  href={selectedNews.original_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
                >
                  查看原文
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="relative">
                  <button
                    onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      isPlaying
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Volume2 className="w-4 h-4" />
                        {voiceMode === 'summary' ? '摘要朗读中' : '完整朗读中'}
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        语音播报
                      </>
                    )}
                  </button>

                  {showVoiceMenu && (
                    <div className="absolute top-full left-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <button
                        onClick={() => {
                          setVoiceMode('summary');
                          setShowVoiceMenu(false);
                          speak('summary');
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          voiceMode === 'summary' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        摘要
                      </button>
                      <button
                        onClick={() => {
                          setVoiceMode('full');
                          setShowVoiceMenu(false);
                          speak('full');
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          voiceMode === 'full' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        完整
                      </button>
                      {isPlaying && (
                        <button
                          onClick={() => {
                            stopSpeak();
                            setShowVoiceMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          停止播放
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">朗读进度</span>
                  <span className="text-xs text-gray-400">
                    {Math.round(readingProgress)}% · 预计 {estimatedReadingTime}秒
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPlaying ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
