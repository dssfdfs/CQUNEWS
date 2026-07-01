import { useState } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Calendar, Download, RefreshCw, Search } from 'lucide-react';

const newsTypeData = [

  { name: '科技', value: 35, color: '#3B82F6' },
  { name: '财经', value: 25, color: '#10B981' },
  { name: '体育', value: 15, color: '#F59E0B' },
  { name: '娱乐', value: 12, color: '#8B5CF6' },
  { name: '时政', value: 10, color: '#EF4444' },
  { name: '健康', value: 8, color: '#14B8A6' },
];

const weeklyData = [
  { name: '周一', count: 45, views: 1200 },
  { name: '周二', count: 52, views: 1500 },
  { name: '周三', count: 38, views: 980 },
  { name: '周四', count: 61, views: 1800 },
  { name: '周五', count: 49, views: 1350 },
  { name: '周六', count: 32, views: 800 },
  { name: '周日', count: 28, views: 720 },
];

const qualityData = [
  { name: '1月', avg: 92 },
  { name: '2月', avg: 88 },
  { name: '3月', avg: 94 },
  { name: '4月', avg: 91 },
  { name: '5月', avg: 96 },
  { name: '6月', avg: 93 },
];

const wordCloudData = [
  { text: 'AI', weight: 85, color: '#3B82F6' },
  { text: '智能', weight: 72, color: '#10B981' },
  { text: '新闻', weight: 90, color: '#8B5CF6' },
  { text: '摘要', weight: 68, color: '#F59E0B' },
  { text: '科技', weight: 65, color: '#EF4444' },
  { text: '财经', weight: 55, color: '#14B8A6' },
  { text: '数据', weight: 78, color: '#EC4899' },
  { text: '分析', weight: 52, color: '#6366F1' },
  { text: '标题', weight: 60, color: '#84CC16' },
  { text: '生成', weight: 58, color: '#F97316' },
  { text: '质量', weight: 70, color: '#06B6D4' },
  { text: '内容', weight: 50, color: '#A855F7' },
  { text: '效率', weight: 45, color: '#22C55E' },
  { text: '学习', weight: 42, color: '#EAB308' },
  { text: '创新', weight: 38, color: '#0EA5E9' },
  { text: '技术', weight: 62, color: '#F43F5E' },
];

const stats = [
  { label: '总处理量', value: '1,258', change: '+12%', color: 'text-green-500' },
  { label: '平均质量', value: '93.5%', change: '+2.3%', color: 'text-green-500' },
  { label: '用户增长', value: '+89', change: '+15%', color: 'text-green-500' },
  { label: '活跃用户', value: '256', change: '+8%', color: 'text-blue-500' },
];

export function Analytics() {
  const [timeRange, setTimeRange] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');

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

      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
                <div className="text-3xl font-bold text-gray-800">{stat.value}</div>
              </div>
              <div className={`text-sm ${stat.color}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">处理趋势</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {timeRange === 'week' ? '本周数据' : timeRange === 'month' ? '本月数据' : '本年数据'}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="处理数量" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="views" name="浏览量" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">新闻类型分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={newsTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {newsTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">关键词云图</h2>
          <div className="flex flex-wrap gap-4 justify-center py-8">
            {wordCloudData.map((word, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-full transition-all hover:scale-105"
                style={{
                  backgroundColor: word.color + '20',
                  color: word.color,
                  fontSize: `${14 + word.weight / 20}px`,
                  fontWeight: word.weight > 70 ? 'bold' : 'normal',
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">质量趋势</h2>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">整体上升趋势</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="平均质量"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">历史记录统计</h2>
          <button className="btn-outline flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">日期</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">处理数量</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">平均质量</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">摘要类型分布</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '2024-06-29', count: 28, quality: 94, types: '标准:15,精简:8,详细:5' },
                { date: '2024-06-28', count: 32, quality: 92, types: '标准:18,精简:10,详细:4' },
                { date: '2024-06-27', count: 25, quality: 95, types: '标准:12,精简:9,详细:4' },
                { date: '2024-06-26', count: 35, quality: 91, types: '标准:20,精简:10,详细:5' },
                { date: '2024-06-25', count: 29, quality: 93, types: '标准:16,精简:8,详细:5' },
              ].map((row) => (
                <tr key={row.date} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-800">{row.date}</td>
                  <td className="py-4 px-4 text-center font-medium text-gray-800">{row.count}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                      row.quality >= 90 ? 'bg-green-100 text-green-700' : row.quality >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.quality}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-gray-500">{row.types}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}