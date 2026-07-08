import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  Eye,
  TrendingUp,
  AlertCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { generateSummary } from '@/api/deepseek';

interface NewsItem {
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

const BOOKMARK_STORAGE_KEY = 'cqunews:bookmarks';
const BROWSE_HISTORY_KEY = 'cqunews:browseHistory';

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

const categoryColors: Record<string, string> = {
  '科技': 'bg-blue-100 text-blue-700',
  '财经': 'bg-green-100 text-green-700',
  '体育': 'bg-red-100 text-red-700',
  '娱乐': 'bg-purple-100 text-purple-700',
  '时政': 'bg-orange-100 text-orange-700',
  '健康': 'bg-teal-100 text-teal-700',
  '教育': 'bg-indigo-100 text-indigo-700',
  '生活': 'bg-pink-100 text-pink-700',
  '国际': 'bg-cyan-100 text-cyan-700',
  '综合': 'bg-gray-100 text-gray-700',
};

export function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<number>>(() => loadBookmarksFromStorage());
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveBookmarksToStorage(bookmarked);
  }, [bookmarked]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || !news) return;
      const element = contentRef.current;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      if (scrollHeight <= 0) return;
      const scrollPosition = (element.scrollTop / scrollHeight) * 100;
      
      const browseHistory: any[] = JSON.parse(localStorage.getItem(BROWSE_HISTORY_KEY) || '[]');
      const existingIndex = browseHistory.findIndex(item => item.id === news.id.toString());
      if (existingIndex !== -1) {
        browseHistory[existingIndex].readPosition = scrollPosition;
        browseHistory[existingIndex].viewedAt = new Date().toISOString();
        localStorage.setItem(BROWSE_HISTORY_KEY, JSON.stringify(browseHistory));
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [news]);

  useEffect(() => {
    if (!contentRef.current || !news || loading) return;
    
    setTimeout(() => {
      try {
        const lastRead = localStorage.getItem('lastReadPosition');
        if (lastRead) {
          const { newsId, position } = JSON.parse(lastRead);
          if (newsId === news.id && position > 0) {
            const element = contentRef.current;
            if (element) {
              const scrollHeight = element.scrollHeight - element.clientHeight;
              element.scrollTop = (scrollHeight * position) / 100;
            }
          }
        }
      } catch {
        // ignore
      }
    }, 300);
  }, [news, loading]);

  useEffect(() => {
    if (!id) return;
    const newsId = parseInt(id, 10);
    if (isNaN(newsId)) {
      setError('无效的新闻ID');
      setLoading(false);
      return;
    }

    const loadNewsDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/news/${newsId}`);
        if (!response.ok) {
          throw new Error('新闻加载失败');
        }
        const data = await response.json();
        setNews(data);
        await incrementViews(newsId);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载新闻失败');
      } finally {
        setLoading(false);
      }
    };

    loadNewsDetail();
  }, [id]);

  const incrementViews = async (newsId: number) => {
    try {
      await fetch(`/api/news/${newsId}/view`, {
        method: 'POST',
      });
      if (news) {
        setNews({ ...news, views: news.views + 1 });
      }
    } catch {
      // ignore
    }
  };

  const toggleBookmark = (newsId: number) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(newsId)) {
        next.delete(newsId);
      } else {
        next.add(newsId);
      }
      return next;
    });
  };

  const handleGenerateSummary = async () => {
    if (!news || !news.content) return;
    setIsGenerating(true);
    try {
      const summary = await generateSummary(news.content, '摘要', '中文');
      setAiSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成摘要失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = async () => {
    if (!aiSummary) return;
    try {
      await navigator.clipboard.writeText(aiSummary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = () => {
    if (news && navigator.share) {
      navigator.share({
        title: news.title,
        text: news.summary || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('链接已复制到剪贴板');
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/summary')}
          className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回新闻推荐
        </button>
        <div className="card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-px bg-gray-200 my-6" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
              <div className="h-4 w-4/6 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/summary')}
          className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回新闻推荐
        </button>
        <div className="card p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">新闻加载失败</h2>
          <p className="text-gray-500 mb-6">{error || '新闻不存在或已被删除'}</p>
          <button
            onClick={() => navigate('/summary')}
            className="btn-primary"
          >
            返回新闻推荐
          </button>
        </div>
      </div>
    );
  }

  const isFav = bookmarked.has(news.id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/summary')}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        返回新闻推荐
      </button>

      <article className="card overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              categoryColors[news.category || ''] || 'bg-gray-100 text-gray-700'
            }`}>
              {news.category || '未分类'}
            </span>
            {news.is_trending && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                热门
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-800 leading-tight flex-1">
              {news.title}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={news.original_url}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary flex items-center gap-2"
                title="阅读原文"
              >
                <ExternalLink className="w-4 h-4" />
                阅读原文
              </a>
              <button
                onClick={() => toggleBookmark(news.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isFav
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
                }`}
                title={isFav ? '取消收藏' : '收藏'}
              >
                {isFav ? (
                  <BookmarkCheck className="w-5 h-5" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                title="分享"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
            {news.source && (
              <span className="flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4" />
                {news.source}
              </span>
            )}
            {news.published_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatTime(news.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {news.views.toLocaleString()} 阅读
            </span>
          </div>
        </div>

        <div className="px-8 py-6 bg-blue-50/50 border-b border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">新闻摘要</h2>
            </div>
            {aiSummary && (
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg text-sm transition-colors"
                title="复制摘要"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            )}
          </div>
          {aiSummary ? (
            <p className="text-gray-700 leading-relaxed">
              {aiSummary}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-gray-400 text-sm mb-3">点击下方按钮生成AI智能摘要</p>
              <button
                onClick={handleGenerateSummary}
                disabled={isGenerating || !news.content}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${
                  isGenerating || !news.content
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isGenerating ? (
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
          )}
        </div>

        <div 
          className="p-8 overflow-y-auto max-h-[calc(100vh-400px)]"
          ref={contentRef}
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="prose prose-lg max-w-none">
            {news.content ? (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                {news.content}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暂无完整内容</p>
                <p className="text-sm mt-1">您可以点击下方按钮查看原文</p>
              </div>
            )}
          </div>
        </div>

        
      </article>
    </div>
  );
}