import { TrendingUp, Clock, FileText, Sparkles, Users, Award } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function HomePage() {
  const { history } = useStore();

  const stats = [
    { icon: FileText, label: '今日处理', value: '12', color: 'bg-blue-500' },
    { icon: TrendingUp, label: '累计摘要', value: '256', color: 'bg-green-500' },
    { icon: Users, label: '活跃用户', value: '89', color: 'bg-purple-500' },
    { icon: Award, label: '优质率', value: '98%', color: 'bg-orange-500' },
  ];

  const recentTasks = history.slice(0, 3);

  const newsCategories = [
    { name: '科技', count: 128, color: 'bg-blue-100 text-blue-700' },
    { name: '财经', count: 86, color: 'bg-green-100 text-green-700' },
    { name: '体育', count: 64, color: 'bg-red-100 text-red-700' },
    { name: '娱乐', count: 92, color: 'bg-purple-100 text-purple-700' },
    { name: '时政', count: 115, color: 'bg-orange-100 text-orange-700' },
    { name: '健康', count: 47, color: 'bg-teal-100 text-teal-700' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">欢迎回来</h1>
          <p className="text-gray-500 mt-1">今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-primary-700">AI 新闻助手</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-6">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-gray-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-primary-600 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">最近处理</h2>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4" />
              <p>暂无处理记录</p>
              <p className="text-sm mt-1">开始处理第一条新闻吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="border border-gray-100 rounded-lg p-4 hover:border-primary-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium line-clamp-2">{task.content.substring(0, 100)}...</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">已完成</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-primary-600 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">新闻分类</h2>
          </div>
          
          <div className="space-y-3">
            {newsCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${cat.color}`}>{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}