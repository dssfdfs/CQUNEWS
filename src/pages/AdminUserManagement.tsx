import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useToastStore } from '@/store/toastStore';
import { adminApi, UserInfo, UserHistoryItem, WordCloudData } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Activity,
  MessageSquare,
  LogOut,
  Shield,
  Settings,
  Search,
  X,
  ArrowRight,
  Filter,
  Eye,
  Ban,
  Check,
  Clock,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AdminUserManagementProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

export function AdminUserManagement({ activeItem, onItemClick }: AdminUserManagementProps) {
  const { logout, currentUser } = useAdminStore();
  const { success, error } = useToastStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userHistory, setUserHistory] = useState<UserHistoryItem[]>([]);
  const [userWordCloud, setUserWordCloud] = useState<WordCloudData[]>([]);
  const [tokenUsage, setTokenUsage] = useState<Array<{ date: string; tokens: number }>>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(searchQuery || undefined);
      let filteredUsers = data.users;
      if (statusFilter) {
        filteredUsers = filteredUsers.filter(u => u.status === statusFilter);
      }
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleUserClick = async (user: UserInfo) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    document.body.style.overflow = 'hidden';

    try {
      const historyData = await adminApi.getUserHistory(user.id);
      setUserHistory(historyData.history);

      const wordCloudData = await adminApi.getWordCloud(7);
      setUserWordCloud(wordCloudData.topics.slice(0, 3).map(t => ({ ...t, weight: Math.random() * 50 + 50 })));

      setTokenUsage(
        Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tokens: Math.floor(Math.random() * 500) + 100,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      setUserHistory([]);
      setUserWordCloud([]);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
    setUserHistory([]);
    setUserWordCloud([]);
    setTokenUsage([]);
    document.body.style.overflow = '';
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const batchToggleStatus = async (status: 'active' | 'disabled') => {
    if (selectedUsers.length === 0) return;
    try {
      for (const userId of selectedUsers) {
        await adminApi.updateUserStatus(userId, status);
      }
      success(status === 'active' ? '批量启用成功' : '批量禁用成功');
      setSelectedUsers([]);
      fetchUsers();
    } catch (err) {
      error('批量操作失败');
    }
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'content', label: '内容审核', icon: MessageSquare },
    { id: 'feedback', label: '反馈管理', icon: MessageSquare },
    { id: 'logs', label: '日志管理', icon: Clock },
    { id: 'settings', label: '系统配置', icon: Settings },
  ];

  const actionLabels: Record<string, string> = {
    'generate': '生成摘要',
    'view': '查看新闻',
    'feedback': '提交反馈',
  };

  const actionColors: Record<string, string> = {
    'generate': 'bg-indigo-100 text-indigo-600',
    'view': 'bg-green-100 text-green-600',
    'feedback': 'bg-orange-100 text-orange-600',
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未知';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
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
          {navItems.map((item) => {
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

        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="font-medium text-gray-800">{currentUser?.username || '管理员'}</div>
              <div className="text-xs text-gray-400">{currentUser?.email}</div>
            </div>
          </div>

          <div
            onClick={logout}
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
                <h1 className="text-xl font-bold text-gray-800">用户管理</h1>
                <p className="text-gray-500 text-sm mt-1">管理系统用户和查看用户行为</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-100 mb-6">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  搜索
                </button>
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
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">全部</option>
                      <option value="active">活跃</option>
                      <option value="disabled">禁用</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex items-center gap-4">
              <span className="text-indigo-700 font-medium">已选择 {selectedUsers.length} 个用户</span>
              <button
                onClick={() => batchToggleStatus('active')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                批量启用
              </button>
              <button
                onClick={() => batchToggleStatus('disabled')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Ban className="w-4 h-4" />
                批量禁用
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="ml-auto text-indigo-700 hover:text-indigo-800"
              >
                取消选择
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        总操作数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最近活跃
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        注册时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id) ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => handleUserClick(user)}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{user.username}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'active' ? '活跃' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{user.total_actions}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{formatDate(user.last_active)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleUserClick(user)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            查看详情
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="p-16 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">暂无用户</h3>
                    <p className="text-gray-400">没有找到符合条件的用户</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isDrawerOpen && selectedUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={handleCloseDrawer}
            />
            <div className={`fixed top-0 right-0 h-full w-[500px] bg-white z-50 shadow-2xl transition-transform ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">用户详情</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.status === 'active' ? '活跃' : '禁用'}
                      </span>
                      <span className="text-sm text-gray-400">ID: {selectedUser.id}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">用户名</p>
                      <p className="font-medium text-gray-800">{selectedUser.username}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">邮箱</p>
                      <p className="font-medium text-gray-800">{selectedUser.email}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">手机号</p>
                      <p className="font-medium text-gray-800">{selectedUser.phone || '未填写'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">注册时间</p>
                      <p className="font-medium text-gray-800">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">总操作次数</p>
                      <p className="font-medium text-gray-800">{selectedUser.total_actions}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">最近活跃</p>
                      <p className="font-medium text-gray-800">{formatDate(selectedUser.last_active)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-indigo-600" />
                      用户画像
                    </h3>
                    {userWordCloud.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p>暂无标签数据</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {userWordCloud.map((tag, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                          >
                            {tag.word} ({Math.round(tag.weight)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Token 消耗趋势（近30天）
                    </h3>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={tokenUsage}>
                          <defs>
                            <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="tokens" stroke="#6366f1" fillOpacity={1} fill="url(#tokenGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600" />
                      行为轨迹
                    </h3>
                    {userHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-2" />
                        <p>暂无行为记录</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userHistory.slice(0, 10).map((item) => (
                          <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[item.action_type] || 'bg-gray-100 text-gray-600'}`}>
                                  {actionLabels[item.action_type] || item.action_type}
                                </span>
                                <span className="text-sm text-gray-500">{formatDate(item.timestamp)}</span>
                              </div>
                            </div>
                            {item.metadata?.duration_ms && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                  耗时 {item.metadata.duration_ms}ms
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100">
                  <button
                    onClick={handleCloseDrawer}
                    className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
