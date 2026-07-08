import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleNewsRedirect } from '../lib/behavior';
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
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { fetchNews, triggerCrawl, type NewsItem } from '@/api/news';
import { useStore } from '@/store/useStore';
import { generateSummary } from '@/api/deepseek';
import { userApi } from '@/lib/api';

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
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/news/${newsId}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.replace('T', ' ').slice(0, 16);
}

export function NewsPreview() {
  const navigate = useNavigate();
  const { setContent, setSummary, setTitles, setQuality, setIsGenerating, setStep } = useStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('推荐');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copySuccessVisible, setCopySuccessVisible] = useState(false);
  const latestFetchId = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const sources = [
    { value: 'all', label: '全部来源' },
    { value: '中国新闻网', label: '中国新闻网' },
    { value: '澎湃新闻', label: '澎湃新闻' },
    { value: '新华网', label: '新华网' },
  ];

  const getSummaryForNews = (item: NewsItem): string => {
    if (!item) return '';
    return aiSummaryCache[item.id] || '';
  };

  const handleGenerateSummary = async (newsItem: NewsItem) => {
    setIsGeneratingSummary(true);
    setShowSummaryPanel(false);
    setSelectedNews(null);
    
    const newsContent = newsItem.content || newsItem.summary || newsItem.title;
    setContent(newsContent);
    setSummary('');
    setTitles({ objective: '', dataHighlight: '', lightweight: '' });
    setQuality({ credibility: 0, readability: 0, engagement: 0, relevance: 0 });
    setStep(1);
    setIsGenerating(false);
    
    navigate('/summary');
    
    setTimeout(() => {
      setIsGeneratingSummary(false);
    }, 500);
  };

  const hasAIEnhancedSummary = (item: NewsItem): boolean => {
    return !!item && !!aiSummaryCache[item.id];
  };

  useEffect(() => {
    saveSummaryCache(aiSummaryCache);
  }, [aiSummaryCache]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const result = await userApi.getFavorites();
        const items = result.data || result.items || [];
        if (items.length > 0) {
          const favoriteIds = new Set(items.map((item: any) => item.id));
          setBookmarked(favoriteIds);
        }
      } catch (error) {
        console.error('加载收藏失败:', error);
      }
    };
    loadFavorites();
  }, []);

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

  const loadNews = async (p = 1, cat = selectedCategory, kw = searchQuery, src = selectedSource) => {
    setLoading(true);
    setError('');
    const fetchId = ++latestFetchId.current;
    try {
      if (cat === '我的收藏') {
        try {
          const result = await userApi.getFavorites();
          let favoriteItems = result.data || result.items || [];
          if (kw.trim()) {
            favoriteItems = favoriteItems.filter((item: any) => 
              item.title.toLowerCase().includes(kw.toLowerCase()) ||
              (item.summary || '').toLowerCase().includes(kw.toLowerCase())
            );
          }
          if (src !== 'all') {
            favoriteItems = favoriteItems.filter((item: any) => item.source === src);
          }
          const totalItems = favoriteItems.length;
          const start = (p - 1) * pageSize;
          const end = start + pageSize;
          const paginatedItems = favoriteItems.slice(start, end);
          if (fetchId !== latestFetchId.current) return;
          setNews(paginatedItems);
          setTotal(totalItems);
          setPage(p);
          setLastUpdated(new Date());
          setLoading(false);
        } catch (error) {
          console.error('获取收藏失败:', error);
          if (fetchId !== latestFetchId.current) return;
          setNews([]);
          setTotal(0);
          setPage(1);
          setLastUpdated(new Date());
          setLoading(false);
        }
        return;
      }

      if (cat === '推荐') {
        const params: { trending_only?: boolean; keyword?: string; source?: string; today_only?: boolean } = { trending_only: true, today_only: true };
        if (kw.trim()) params.keyword = kw.trim();
        if (src !== 'all') params.source = src;
        const data = await fetchNews(p, pageSize, params);
        if (fetchId !== latestFetchId.current) return;
        setNews(data.items);
        setTotal(data.total);
        setPage(data.page);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      const params: { category?: string; keyword?: string; source?: string; today_only?: boolean } = { today_only: true };
      if (cat !== '全部') params.category = cat;
      if (kw.trim()) params.keyword = kw.trim();
      if (src !== 'all') params.source = src;
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
    loadNews(1, selectedCategory, searchQuery, selectedSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSource]);

  useEffect(() => {
    const t = setTimeout(() => loadNews(1, selectedCategory, searchQuery, selectedSource), 400);
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

  const toggleBookmark = async (id: number) => {
    try {
      const result = await userApi.toggleFavorite(id);
      if (result.code === 0) {
        if (result.is_favorite) {
          setBookmarked((prev) => new Set(prev).add(id));
        } else {
          setBookmarked((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          if (selectedCategory === '我的收藏') {
            setNews((prev) => prev.filter((item) => item.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            setPage((p) => Math.max(1, p));
          }
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
    }
  };

  const handleGenerateAISummary = async (newsId: number) => {
    if (generatingSummaryIds.has(newsId)) return;
    setGeneratingSummaryIds((prev) => new Set(prev).add(newsId));
    try {
      const newsItem = news.find(n => n.id === newsId);
      if (!newsItem?.content) {
        alert('新闻内容为空，无法生成摘要');
        return;
      }
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
      } else {
        alert('生成摘要失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(`生成摘要失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setGeneratingSummaryIds((prev) => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
    }
  };

  const handleCopySummary = async (summary: string) => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setCopySuccessVisible(true);
      copyTimerRef.current = setTimeout(() => {
        setCopySuccessVisible(false);
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = summary;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        setCopySuccessVisible(true);
        copyTimerRef.current = setTimeout(() => {
          setCopySuccessVisible(false);
        }, 2000);
      } catch {
        alert('复制失败，请手动复制');
      } finally {
        document.body.removeChild(textarea);
      }
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
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-sm"
            >
              {sources.map(src => (
                <option key={src.value} value={src.value}>{src.label}</option>
              ))}
            </select>
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
                      onClick={() => handleNewsRedirect(item.id, item.original_url, item.category, item.title)}
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
                <h4 className="text-sm font-medium text-gray-700 mb-2">一键摘要</h4>
                {getSummaryForNews(selectedNews) ? (
                  <>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      {getSummaryForNews(selectedNews)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopySummary(getSummaryForNews(selectedNews))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
                        title="复制摘要"
                      >
                        <Copy className="w-4 h-4" />
                        复制
                      </button>
                      {copySuccessVisible && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="w-4 h-4" />
                          复制成功
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                      </div>
                      <p className="text-gray-400 text-sm mb-4">点击下方按钮生成AI智能摘要</p>
                      <button
                        onClick={() => handleGenerateAISummary(selectedNews.id)}
                        disabled={generatingSummaryIds.has(selectedNews.id) || !selectedNews.content}
                        className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition ${
                          generatingSummaryIds.has(selectedNews.id) || !selectedNews.content
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {generatingSummaryIds.has(selectedNews.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            一键生成摘要
                          </>
                        )}
                      </button>
                    </div>
                  </>
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
                <button
                  onClick={() => handleGenerateSummary(selectedNews)}
                  disabled={isGeneratingSummary}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isGeneratingSummary
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      一键导入文本
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleNewsRedirect(selectedNews.id, selectedNews.original_url, selectedNews.category, selectedNews.title)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                >
                  查看原文
                  <ExternalLink className="w-4 h-4" />
                </button>

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