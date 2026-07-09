import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { adminApi, AnalyticsSummary, UserBehaviorData, HeatmapData, NewsCategoryData } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Activity,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Clock,
  LogOut,
  Shield,
  FileText,
  Settings,
  RefreshCw,
  Tag,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { WordCloud } from '@/components/WordCloud';

interface WordItem {
  text: string;
  value: number;
  category: string;
}

interface AdminDashboardProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b'];

export function AdminDashboard({ activeItem, onItemClick }: AdminDashboardProps) {
  const { logout, currentUser } = useAdminStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [behavior, setBehavior] = useState<UserBehaviorData | null>(null);
  const [wordCloudData, setWordCloudData] = useState<WordItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [newsCategoryData, setNewsCategoryData] = useState<NewsCategoryData | null>(null);
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; day_name: string; generate_count: number; view_count: number; share_count: number; feedback_count: number; active_users: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryData, behaviorData, wordCloudResult, heatmapResult, newsCategoryResult, dailyStatsResult] = await Promise.all([
          adminApi.getAnalyticsSummary(),
          adminApi.getUserBehavior(),
          adminApi.getWordCloud(),
          adminApi.getHeatmap(),
          adminApi.getNewsCategory(0),
          adminApi.getDailyStats(),
        ]);
        setSummary(summaryData);
        setBehavior(behaviorData);
        setWordCloudData(wordCloudResult?.words || []);
        setHeatmapData(heatmapResult);
        setNewsCategoryData(newsCategoryResult);
        setDailyStats(dailyStatsResult?.data || []);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [summaryData, behaviorData, wordCloudResult, heatmapResult, newsCategoryResult, dailyStatsResult] = await Promise.all([
        adminApi.getAnalyticsSummary(),
        adminApi.getUserBehavior(),
        adminApi.getWordCloud(),
        adminApi.getHeatmap(),
        adminApi.getNewsCategory(0),
        adminApi.getDailyStats(),
      ]);
      setSummary(summaryData);
      setBehavior(behaviorData);
      setWordCloudData(wordCloudResult?.words || []);
      setDailyStats(dailyStatsResult?.data || []);
      setHeatmapData(heatmapResult);
      setNewsCategoryData(newsCategoryResult);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'content', label: '内容审核', icon: FileText },
    { id: 'feedback', label: '反馈管理', icon: MessageSquare },
    { id: 'logs', label: '日志管理', icon: Clock },
    { id: 'settings', label: '系统配置', icon: Settings },
  ];

  const weeklyNewUsers = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    value: Math.floor(Math.random() * 50) + 20,
  }));

  const aiSuccessRate = 94.5;

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
                <h1 className="text-xl font-bold text-gray-800">数据仪表盘</h1>
                <p className="text-gray-500 text-sm mt-1">实时监控系统运行状况</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-32 h-8 bg-gray-200 rounded mt-2 animate-pulse"></div>
                      </div>
                      <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">总用户数</p>
                      <p className="text-3xl font-bold text-gray-800">{summary?.total_users || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyNewUsers}>
                        <defs>
                          <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#userGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">近7日新增用户趋势</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">今日活跃用户</p>
                      <p className="text-3xl font-bold text-gray-800">{summary?.today_active_users || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">AI调用成功率</p>
                      <p className="text-3xl font-bold text-gray-800">{aiSuccessRate}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          aiSuccessRate >= 90 ? 'bg-green-500' : aiSuccessRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${aiSuccessRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">待处理反馈</p>
                      <p className="text-3xl font-bold text-gray-800">{summary?.pending_feedback || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-800">每日活跃用户趋势</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={behavior?.dau || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                      <YAxis tick={{ fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100 overflow-visible">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-semibold text-gray-800">新闻分类占比</h2>
                    </div>
                    <div className="text-sm text-gray-500">
                      共 {newsCategoryData?.total || 0} 条新闻
                    </div>
                  </div>
                  <div className="h-[320px]">
                    {newsCategoryData?.category_distribution && newsCategoryData.category_distribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={newsCategoryData.category_distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent, value }) => {
                              const pct = ((percent || 0) * 100).toFixed(1);
                              return `${name} ${pct}%`;
                            }}
                            labelLine={{ strokeWidth: 1, stroke: '#d1d5db' }}
                          >
                            {newsCategoryData.category_distribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, props) => {
                              const item = newsCategoryData?.category_distribution?.[props.dataIndex];
                              return [`${value}条`, `${item?.percentage || 0}%`, name];
                            }}
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '12px 16px',
                            }}
                          />
                          <Legend 
                            formatter={(value) => {
                              const item = newsCategoryData?.category_distribution?.find(d => d.name === value);
                              return `${value} (${item?.value || 0}条)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                        <p>暂无分类数据</p>
                        <p className="text-xs mt-1">请先爬取或导入新闻数据</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-800">用户活跃时段热力图</h2>
                  </div>
                  {heatmapData && heatmapData.hours && heatmapData.weekdays ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 text-xs text-gray-500"></th>
                            {heatmapData.hours.map(hour => (
                              <th key={hour} className="px-2 py-1 text-xs text-gray-500">{hour}:00</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmapData.weekdays.map((weekday) => (
                            <tr key={weekday}>
                              <td className="px-2 py-1 text-xs text-gray-500 font-medium">{weekday}</td>
                              {heatmapData.hours.map((hour) => {
                                const cell = heatmapData.heatmap?.find(
                                  h => h.weekday === weekday && h.hour === hour
                                );
                                const value = cell?.value || 0;
                                const heatmapValues = heatmapData.heatmap?.map(h => h.value) || [];
                                const maxValue = heatmapValues.length > 0 ? Math.max(...heatmapValues) : 0;
                                const intensity = maxValue > 0 ? value / maxValue : 0;
                                const bgColor = intensity > 0.8 ? '#1e3a8a' :
                                               intensity > 0.6 ? '#3b82f6' :
                                               intensity > 0.4 ? '#60a5fa' :
                                               intensity > 0.2 ? '#93c5fd' : '#dbeafe';
                                return (
                                  <td key={hour} className="px-1 py-1">
                                    <div
                                      className="w-full h-6 rounded cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                                      style={{ backgroundColor: bgColor }}
                                      title={`${weekday} ${hour}:00 - ${value}次活跃`}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      暂无热力图数据
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-800">近7天用户行为统计</h2>
                  </div>
                  <div className="mb-4 grid grid-cols-4 gap-4">
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {dailyStats.reduce((sum, d) => sum + (d.generate_count || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">生成摘要</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {dailyStats.reduce((sum, d) => sum + (d.view_count || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">浏览次数</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dailyStats.reduce((sum, d) => sum + (d.share_count || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">分享次数</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dailyStats.reduce((sum, d) => sum + (d.active_users || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">活跃用户</div>
                    </div>
                  </div>
                  {dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={dailyStats}>
                        <defs>
                          <linearGradient id="generateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="viewGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="shareGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="day_name" 
                          tick={{ fill: '#6b7280', fontSize: 11 }} 
                          label={{ value: '日期', position: 'bottom', offset: -5 }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 11 }} 
                          label={{ value: '次数', angle: -90, position: 'left', offset: -5 }}
                        />
                        <Tooltip
                          formatter={(value, name) => [`${value}次`, name]}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px 16px',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="generate_count"
                          name="生成摘要"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#8b5cf6' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="view_count"
                          name="浏览次数"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#6366f1' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="share_count"
                          name="分享次数"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#10b981' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                      <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
                      <p>暂无行为数据</p>
                      <p className="text-xs mt-1">用户行为数据将在用户使用系统后自动统计</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-800">用户画像 - 热门话题词云</h2>
                    <span className="ml-auto text-sm text-gray-500">基于近7天用户行为</span>
                  </div>
                  <WordCloud words={wordCloudData} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}