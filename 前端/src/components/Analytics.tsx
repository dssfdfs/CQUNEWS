import { useState, useEffect } from 'react';
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar, Download, RefreshCw, Search, Tag, Clock, Activity } from 'lucide-react';


interface WordItem {
  text: string;
  value: number;
  category: string;
}

const newsTypeData = [
  { name: '科技', value: 35, color: '#3B82F6' },
  { name: '财经', value: 25, color: '#10B981' },
  { name: '体育', value: 15, color: '#F59E0B' },
  { name: '娱乐', value: 12, color: '#8B5CF6' },
  { name: '时政', value: 10, color: '#EF4444' },
  { name: '健康', value: 8, color: '#14B8A6' },
];

const categoryColors: Record<string, string> = {
  '科技': '#6366f1',
  '财经': '#f97316',
  '体育': '#10b981',
  '娱乐': '#ec4899',
  '时政': '#8b5cf6',
  '教育': '#06b6d4',
  '健康': '#22c55e',
  '生活': '#f59e0b',
  '其他': '#6b7280',
};

export function Analytics() {
  const [timeRange, setTimeRange] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [wordCloudData, setWordCloudData] = useState<WordItem[]>([]);
  const [trendData, setTrendData] = useState<Array<{ name: string; count: number; views: number; quality: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const mockWordCloud: WordItem[] = [
          { text: 'AI', value: 85, category: '科技' },
          { text: '智能', value: 72, category: '科技' },
          { text: '新闻', value: 90, category: '其他' },
          { text: '摘要', value: 68, category: '其他' },
          { text: '科技', value: 65, category: '科技' },
          { text: '财经', value: 55, category: '财经' },
          { text: '数据', value: 78, category: '科技' },
          { text: '分析', value: 52, category: '其他' },
          { text: '标题', value: 60, category: '其他' },
          { text: '生成', value: 58, category: '科技' },
          { text: '质量', value: 70, category: '其他' },
          { text: '内容', value: 50, category: '其他' },
          { text: '效率', value: 45, category: '财经' },
          { text: '学习', value: 42, category: '教育' },
          { text: '创新', value: 38, category: '科技' },
          { text: '技术', value: 62, category: '科技' },
          { text: '投资', value: 48, category: '财经' },
          { text: '健康', value: 40, category: '健康' },
          { text: '体育', value: 35, category: '体育' },
          { text: '娱乐', value: 32, category: '娱乐' },
          { text: '时政', value: 55, category: '时政' },
          { text: '教育', value: 44, category: '教育' },
          { text: '生活', value: 36, category: '生活' },
          { text: '趋势', value: 58, category: '其他' },
          { text: '洞察', value: 42, category: '其他' },
        ];
        setWordCloudData(mockWordCloud);

        const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
        const mockTrendData: typeof trendData = Array.from({ length: days }, (_, i) => {
          const baseCount = 40 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
          const baseViews = 1000 + Math.sin(i * 0.3) * 300 + Math.random() * 200;
          const baseQuality = 88 + Math.sin(i * 0.2) * 5 + Math.random() * 4;
          const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
          const name = timeRange === 'week' 
            ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][date.getDay()]
            : timeRange === 'month'
            ? `${date.getMonth() + 1}/${date.getDate()}`
            : `${date.getMonth() + 1}月`;
          return {
            name,
            count: Math.round(baseCount),
            views: Math.round(baseViews),
            quality: Math.round(baseQuality),
          };
        });
        setTrendData(mockTrendData);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const mockWordCloud: WordItem[] = [
        { text: 'AI', value: 85 + Math.floor(Math.random() * 10), category: '科技' },
        { text: '智能', value: 72 + Math.floor(Math.random() * 8), category: '科技' },
        { text: '新闻', value: 90 + Math.floor(Math.random() * 5), category: '其他' },
        { text: '摘要', value: 68 + Math.floor(Math.random() * 6), category: '其他' },
        { text: '科技', value: 65 + Math.floor(Math.random() * 7), category: '科技' },
        { text: '财经', value: 55 + Math.floor(Math.random() * 8), category: '财经' },
        { text: '数据', value: 78 + Math.floor(Math.random() * 5), category: '科技' },
        { text: '分析', value: 52 + Math.floor(Math.random() * 6), category: '其他' },
        { text: '标题', value: 60 + Math.floor(Math.random() * 7), category: '其他' },
        { text: '生成', value: 58 + Math.floor(Math.random() * 5), category: '科技' },
        { text: '质量', value: 70 + Math.floor(Math.random() * 6), category: '其他' },
        { text: '内容', value: 50 + Math.floor(Math.random() * 4), category: '其他' },
        { text: '效率', value: 45 + Math.floor(Math.random() * 5), category: '财经' },
        { text: '学习', value: 42 + Math.floor(Math.random() * 4), category: '教育' },
        { text: '创新', value: 38 + Math.floor(Math.random() * 6), category: '科技' },
        { text: '技术', value: 62 + Math.floor(Math.random() * 5), category: '科技' },
        { text: '投资', value: 48 + Math.floor(Math.random() * 7), category: '财经' },
        { text: '健康', value: 40 + Math.floor(Math.random() * 5), category: '健康' },
        { text: '体育', value: 35 + Math.floor(Math.random() * 6), category: '体育' },
        { text: '娱乐', value: 32 + Math.floor(Math.random() * 4), category: '娱乐' },
        { text: '时政', value: 55 + Math.floor(Math.random() * 5), category: '时政' },
        { text: '教育', value: 44 + Math.floor(Math.random() * 6), category: '教育' },
        { text: '生活', value: 36 + Math.floor(Math.random() * 5), category: '生活' },
        { text: '趋势', value: 58 + Math.floor(Math.random() * 6), category: '其他' },
        { text: '洞察', value: 42 + Math.floor(Math.random() * 5), category: '其他' },
      ];
      setWordCloudData(mockWordCloud);

      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const mockTrendData: typeof trendData = Array.from({ length: days }, (_, i) => {
        const baseCount = 40 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
        const baseViews = 1000 + Math.sin(i * 0.3) * 300 + Math.random() * 200;
        const baseQuality = 88 + Math.sin(i * 0.2) * 5 + Math.random() * 4;
        const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const name = timeRange === 'week' 
          ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][date.getDay()]
          : timeRange === 'month'
          ? `${date.getMonth() + 1}/${date.getDate()}`
          : `${date.getMonth() + 1}月`;
        return {
          name,
          count: Math.round(baseCount),
          views: Math.round(baseViews),
          quality: Math.round(baseQuality),
        };
      });
      setTrendData(mockTrendData);
      setLoading(false);
    }, 1000);
  };

  const totalCount = trendData.reduce((sum, item) => sum + item.count, 0);
  const avgQuality = trendData.length > 0 
    ? Math.round(trendData.reduce((sum, item) => sum + item.quality, 0) / trendData.length) 
    : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">数据分析</h1>
          <p className="text-gray-500 mt-1">查看新闻处理数据和统计分析</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索数据..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">处理趋势</h2>
                <p className="text-sm text-gray-500">新闻处理数量与浏览量变化趋势</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {timeRange === 'week' ? '本周数据' : timeRange === 'month' ? '本月数据' : '本年数据'}
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
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-400">
              <RefreshCw className="w-12 h-12 animate-spin" />
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="countGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    label={{ value: '处理数量', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    label={{ value: '浏览量', angle: 90, position: 'insideRight', fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' 
                        ? name === 'count' ? `${value} 条` : `${value.toLocaleString()} 次`
                        : String(value),
                      name === 'count' ? '处理数量' : '浏览量',
                    ]}
                  />
                  <Legend
                    iconType="line"
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value === 'count' ? '处理数量' : value === 'views' ? '浏览量' : value}</span>
                    )}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    fill="url(#countGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="views" 
                    stroke="#10b981" 
                    fill="url(#viewsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>总处理量: {totalCount.toLocaleString()} 条</span>
            <span>平均质量: {avgQuality}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">新闻类型分布</h2>
              <p className="text-sm text-gray-500">各类型新闻占比统计</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={newsTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#e5e7eb' }}
                >
                  {newsTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  formatter={(value) => [`${typeof value === 'number' ? value : 0}%`, '占比']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {newsTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">关键词云图</h2>
              <p className="text-sm text-gray-500">基于用户行为的热门话题</p>
            </div>
          </div>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <RefreshCw className="w-12 h-12 animate-spin" />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center flex-wrap gap-3 p-4 overflow-y-auto">
              {wordCloudData.map((word, index) => {
                const maxValue = Math.max(...wordCloudData.map(w => w.value));
                const minValue = Math.min(...wordCloudData.map(w => w.value));
                const normalizedSize = minValue === maxValue 
                  ? 1 
                  : (word.value - minValue) / (maxValue - minValue);
                const fontSize = 14 + normalizedSize * 32;
                const color = categoryColors[word.category] || '#6b7280';
                return (
                  <span
                    key={index}
                    className="px-4 py-2 rounded-full cursor-default hover:shadow-md transition-shadow"
                    style={{
                      fontSize: `${fontSize}px`,
                      backgroundColor: `${color}15`,
                      color: color,
                      fontWeight: normalizedSize > 0.7 ? '600' : '400',
                    }}
                    title={`${word.text}: ${word.value}次 - ${word.category}`}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {[
              { label: '科技', color: '#6366f1' },
              { label: '财经', color: '#f97316' },
              { label: '体育', color: '#10b981' },
              { label: '娱乐', color: '#ec4899' },
              { label: '时政', color: '#8b5cf6' },
              { label: '教育', color: '#06b6d4' },
              { label: '健康', color: '#22c55e' },
              { label: '生活', color: '#f59e0b' },
            ].map((cat) => (
              <div key={cat.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                ></span>
                <span className="text-sm text-gray-600">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">质量趋势</h2>
              <p className="text-sm text-gray-500">新闻处理质量变化趋势</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500">整体上升趋势</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <defs>
                <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                domain={[80, 100]}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                label={{ value: '质量分数', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                formatter={(value) => [`${typeof value === 'number' ? value : 0}%`, '质量分数']}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name="平均质量"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#8b5cf6' }}
                fill="url(#qualityGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}