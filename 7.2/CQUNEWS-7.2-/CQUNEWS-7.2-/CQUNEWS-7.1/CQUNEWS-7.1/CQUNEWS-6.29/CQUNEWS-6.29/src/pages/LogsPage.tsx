import { useEffect, useState } from 'react';
import { adminApi, AuditLogItem } from '@/lib/api';
import {
  Search,
  Clock,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Settings,
} from 'lucide-react';

interface LogsPageProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

export function LogsPage({ activeItem, onItemClick }: LogsPageProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getLogs(search || undefined, undefined, page, pageSize);
      setLogs(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const actionLabels: Record<string, string> = {
    approve_content: '审核通过',
    reject_content: '审核拒绝',
    login: '登录系统',
    logout: '退出系统',
    update_config: '更新配置',
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            管理后台
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '仪表盘', icon: Clock },
            { id: 'users', label: '用户管理', icon: User },
            { id: 'content', label: '内容审核', icon: FileText },
            { id: 'feedback', label: '反馈管理', icon: FileText },
            { id: 'logs', label: '日志管理', icon: Clock },
            { id: 'settings', label: '系统配置', icon: Settings },
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
        <div className="p-4 border-t border-gray-100">
          <div
            onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">退出登录</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-800">系统日志</h1>
                <p className="text-gray-500 text-sm mt-1">查看系统操作记录</p>
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
                  placeholder="搜索操作、目标或详情..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                    <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-16 text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无日志</h3>
                <p className="text-gray-400">系统暂无操作记录</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作人</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">目标</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">详情</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-800">{log.username || '系统'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                            {actionLabels[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600 text-sm">{log.target || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600 text-sm max-w-[200px] truncate block" title={log.detail || ''}>
                            {log.detail || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 text-sm">
                            {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
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
    </div>
  );
}
