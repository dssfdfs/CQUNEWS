import { useEffect, useState } from 'react';
import { adminApi, NewsItem, NewsDetail } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Search,
  Filter,
  Check,
  X,
  Eye,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
} from 'lucide-react';

interface ContentModerationPageProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

export function ContentModerationPage({ activeItem, onItemClick }: ContentModerationPageProps) {
  const { success, error } = useToastStore();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsDetail | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [newsToReject, setNewsToReject] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getContentList(statusFilter || undefined, search || undefined, page, pageSize);
      setNewsList(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Fetch news failed:', err);
      error('加载新闻列表失败');
      setNewsList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [page, statusFilter, search]);

  const handleApprove = async (newsId: number) => {
    try {
      await adminApi.approveContent(newsId);
      success('审核通过');
      fetchNews();
    } catch (err) {
      error('审核失败');
    }
  };

  const handleRejectClick = (newsId: number) => {
    setNewsToReject(newsId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!newsToReject || !rejectReason) return;
    try {
      await adminApi.rejectContent(newsToReject, rejectReason);
      success('已拒绝');
      setShowRejectModal(false);
      setRejectReason('');
      setNewsToReject(null);
      fetchNews();
    } catch (err) {
      error('操作失败');
    }
  };

  const handleViewDetail = async (newsId: number) => {
    try {
      const detail = await adminApi.getContentDetail(newsId);
      setSelectedNews(detail);
      setShowDetail(true);
    } catch (err) {
      error('加载详情失败');
    }
  };

  const statusConfig = {
    pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    published: { label: '已发布', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const rejectReasons = ['标题党', '内容重复', '内容低俗', '虚假信息', '广告推广', '其他'];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-8 h-8 text-indigo-600" />
            管理后台
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '仪表盘', icon: Clock },
            { id: 'users', label: '用户管理', icon: Eye },
            { id: 'content', label: '内容审核', icon: AlertCircle },
            { id: 'feedback', label: '反馈管理', icon: Star },
            { id: 'logs', label: '日志管理', icon: Clock },
            { id: 'settings', label: '系统配置', icon: Star },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                  activeItem === item.id
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-800">内容审核</h1>
                <p className="text-gray-500 text-sm mt-1">审核和管理爬取的新闻内容</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-100 mb-6">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索标题或来源..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilter ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                筛选
              </button>
            </div>

            {showFilter && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">全部</option>
                      <option value="pending">待审核</option>
                      <option value="published">已发布</option>
                      <option value="rejected">已拒绝</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                    <div className="w-1/3 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : newsList.length === 0 ? (
              <div className="p-16 text-center">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无新闻</h3>
                <p className="text-gray-400">没有找到符合条件的新闻内容</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">标题</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">来源</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">分类</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">质量评分</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">爬取时间</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {newsList.map((news) => {
                      const StatusIcon = statusConfig[news.review_status as keyof typeof statusConfig]?.icon || Clock;
                      const statusStyle = statusConfig[news.review_status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-700';
                      return (
                        <tr key={news.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-800 max-w-[300px] truncate block">{news.title}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">{news.source || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">{news.category || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className={`font-medium ${news.quality_score >= 80 ? 'text-green-600' : news.quality_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {news.quality_score}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[news.review_status as keyof typeof statusConfig]?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-500 text-sm">
                              {news.created_at ? new Date(news.created_at).toLocaleString('zh-CN') : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDetail(news.id)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="查看详情"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {news.review_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(news.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="通过"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectClick(news.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="拒绝"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      共 {total} 条记录，当前第 {page} 页
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-gray-700">{page}</span>
                      <button
                        onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                        disabled={page >= Math.ceil(total / pageSize)}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showDetail && selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">新闻详情</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{selectedNews.title}</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">来源</span>
                  <p className="font-medium text-gray-800">{selectedNews.source || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">分类</span>
                  <p className="font-medium text-gray-800">{selectedNews.category || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">质量评分</span>
                  <p className="font-medium text-gray-800">{selectedNews.quality_score}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">状态</span>
                  <p className="font-medium text-gray-800">{statusConfig[selectedNews.review_status as keyof typeof statusConfig]?.label}</p>
                </div>
              </div>
              {selectedNews.summary && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">摘要</h4>
                  <p className="text-gray-600">{selectedNews.summary}</p>
                </div>
              )}
              {selectedNews.content && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">内容</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedNews.content}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  if (selectedNews.review_status === 'pending') {
                    handleApprove(selectedNews.id);
                    setShowDetail(false);
                  }
                }}
                disabled={selectedNews.review_status !== 'pending'}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {selectedNews.review_status === 'pending' ? '审核通过' : '已审核'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-[400px]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">拒绝新闻</h2>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setNewsToReject(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">拒绝原因</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {rejectReasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                      rejectReason === reason ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); setNewsToReject(null); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
