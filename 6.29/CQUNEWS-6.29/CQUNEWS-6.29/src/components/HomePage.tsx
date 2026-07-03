import { TrendingUp, Clock, FileText, Sparkles, Users, Award, ChevronRight, ArrowRight, Newspaper, Zap, Target, Shield } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface HistoryItem {
  id: string;
  content: string;
  summary: string;
  titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  };
  quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  };
  status: string;
  category: string;
  createdAt: Date;
}

const mockHistoryData: HistoryItem[] = [
  {
    id: '1',
    content: '人工智能作为新一轮科技革命与产业变革的核心驱动力，正在深刻改变人们的生产生活方式。随着ChatGPT等大语言模型的推出，AI技术已经从实验室走向了实际应用场景，涵盖教育、医疗、金融、制造等多个领域。专家预测，未来十年AI将创造数百万个新岗位，同时也将重塑现有产业格局。',
    summary: '人工智能正成为科技革命的核心驱动力，已从实验室走向实际应用，涵盖多个领域。专家预测未来十年AI将创造数百万新岗位并重塑产业格局。',
    titles: {
      objective: '人工智能技术发展现状与未来趋势分析',
      dataHighlight: 'AI技术突破：未来十年将创造百万新岗位',
      lightweight: 'AI改变世界：从实验室到产业应用'
    },
    quality: {
      coverageRate: 85,
      titleDeviation: 12,
      hallucinationCount: 0
    },
    status: '已完成',
    category: '科技',
    createdAt: new Date(Date.now() - 3600000)
  },
  {
    id: '2',
    content: '2024年全球经济形势呈现复杂多变的态势。尽管面临通胀压力和地缘政治不确定性，亚洲新兴市场依然表现出较强的韧性。中国经济在一系列稳增长政策的推动下，实现了稳步复苏，消费市场持续回暖，制造业PMI指数连续三个月保持在荣枯线以上。',
    summary: '2024年全球经济形势复杂多变，但亚洲新兴市场表现出较强韧性。中国经济在稳增长政策推动下稳步复苏，消费市场回暖，制造业PMI连续三个月保持荣枯线以上。',
    titles: {
      objective: '2024年全球经济形势分析与展望',
      dataHighlight: '中国经济稳步复苏：PMI指数连续三月荣枯线上',
      lightweight: '全球经济新趋势：亚洲市场韧性凸显'
    },
    quality: {
      coverageRate: 92,
      titleDeviation: 8,
      hallucinationCount: 0
    },
    status: '已完成',
    category: '财经',
    createdAt: new Date(Date.now() - 7200000)
  },
  {
    id: '3',
    content: '教育部近日发布了关于深化教育改革的指导意见，提出要全面提升教育质量，推动教育数字化转型。意见指出，未来五年将加大对基础教育的投入，完善职业教育体系，促进高等教育内涵式发展。同时，要加强教师队伍建设，提高教师待遇和专业水平。',
    summary: '教育部发布深化教育改革指导意见，提出全面提升教育质量，推动数字化转型。未来五年将加大基础教育投入，完善职业教育体系，促进高等教育内涵式发展，加强教师队伍建设。',
    titles: {
      objective: '教育部发布深化教育改革指导意见',
      dataHighlight: '教育改革五年规划：加大投入与数字化转型',
      lightweight: '教育新政策：全面提升教育质量'
    },
    quality: {
      coverageRate: 88,
      titleDeviation: 10,
      hallucinationCount: 0
    },
    status: '已完成',
    category: '教育',
    createdAt: new Date(Date.now() - 14400000)
  },
  {
    id: '4',
    content: '2024年巴黎奥运会开幕式精彩纷呈，吸引了全球数十亿观众的关注。中国代表团在开幕式上展现了良好的精神风貌，运动员们信心满满地迎接即将到来的比赛。据悉，中国代表团此次派出了史上规模最大的参赛阵容，将参加30多个大项的角逐。',
    summary: '2024年巴黎奥运会开幕式精彩纷呈，吸引全球数十亿观众关注。中国代表团展现良好精神风貌，派出史上最大规模参赛阵容，将参加30多个大项的角逐。',
    titles: {
      objective: '巴黎奥运会开幕式盛大举行',
      dataHighlight: '中国代表团规模创历史：参加30余项角逐',
      lightweight: '巴黎奥运开幕：全球瞩目'
    },
    quality: {
      coverageRate: 90,
      titleDeviation: 5,
      hallucinationCount: 0
    },
    status: '已完成',
    category: '体育',
    createdAt: new Date(Date.now() - 28800000)
  },
  {
    id: '5',
    content: '近期国际油价波动引起了市场广泛关注。受中东地缘政治紧张局势影响，国际油价一度突破每桶90美元关口。各国政府纷纷采取措施应对油价上涨带来的压力，包括释放战略石油储备、推动新能源替代等。分析人士认为，短期内油价仍将维持高位运行。',
    summary: '国际油价因中东地缘政治紧张局势波动，一度突破每桶90美元。各国政府采取释放战略石油储备、推动新能源替代等措施应对。分析人士认为短期内油价将维持高位。',
    titles: {
      objective: '国际油价波动分析与市场影响',
      dataHighlight: '油价突破90美元：地缘政治紧张加剧',
      lightweight: '油价上涨：全球市场应对策略'
    },
    quality: {
      coverageRate: 86,
      titleDeviation: 15,
      hallucinationCount: 0
    },
    status: '已完成',
    category: '国际',
    createdAt: new Date(Date.now() - 43200000)
  }
];

export function HomePage() {
  const { history, setContent, setSummary, setTitles, setStep, setQuality } = useStore();

  const displayHistory = history.length > 0 ? history : mockHistoryData;
  const recentTasks = displayHistory.slice(0, 5);

  const stats = [
    { 
      icon: FileText, 
      label: '今日处理', 
      value: history.length > 0 ? recentTasks.filter(t => {
        const today = new Date();
        const taskDate = new Date(t.createdAt);
        return taskDate.toDateString() === today.toDateString();
      }).length.toString() : '3', 
      color: 'bg-blue-500',
      description: '条新闻'
    },
    { 
      icon: TrendingUp, 
      label: '累计摘要', 
      value: history.length > 0 ? history.length.toString() : '156', 
      color: 'bg-green-500',
      description: '条记录'
    },
    { 
      icon: Users, 
      label: '活跃用户', 
      value: '89', 
      color: 'bg-purple-500',
      description: '人'
    },
    { 
      icon: Award, 
      label: '优质率', 
      value: history.length > 0 ? Math.round(history.reduce((sum, t) => sum + (t.quality.coverageRate || 0), 0) / history.length) + '%' : '98%', 
      color: 'bg-orange-500',
      description: ''
    },
  ];

  const newsCategories = [
    { name: '科技', count: history.length > 0 ? history.filter(h => h.category === '科技').length : 68, color: 'bg-blue-100 text-blue-700' },
    { name: '财经', count: history.length > 0 ? history.filter(h => h.category === '财经').length : 45, color: 'bg-green-100 text-green-700' },
    { name: '体育', count: history.length > 0 ? history.filter(h => h.category === '体育').length : 32, color: 'bg-red-100 text-red-700' },
    { name: '娱乐', count: history.length > 0 ? history.filter(h => h.category === '娱乐').length : 56, color: 'bg-purple-100 text-purple-700' },
    { name: '国际', count: history.length > 0 ? history.filter(h => h.category === '国际').length : 48, color: 'bg-orange-100 text-orange-700' },
    { name: '教育', count: history.length > 0 ? history.filter(h => h.category === '教育').length : 28, color: 'bg-teal-100 text-teal-700' },
  ];

  const quickActions = [
    { icon: Zap, title: '快速生成', description: '一键生成摘要和标题', color: 'bg-gradient-to-br from-yellow-400 to-orange-500', onClick: () => setStep(1) },
    { icon: Target, title: '质量校验', description: '检测摘要质量指标', color: 'bg-gradient-to-br from-blue-400 to-indigo-500', onClick: () => setStep(4) },
    { icon: Shield, title: '历史记录', description: '查看所有处理记录', color: 'bg-gradient-to-br from-green-400 to-emerald-500', onClick: () => setStep(6) },
  ];

  const handleViewTask = (task: typeof displayHistory[0]) => {
    setContent(task.content);
    setSummary(task.summary);
    setTitles(task.titles);
    setQuality(task.quality);
    setStep(5);
  };

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      '科技': { bg: 'bg-blue-100', text: 'text-blue-700' },
      '财经': { bg: 'bg-green-100', text: 'text-green-700' },
      '国际': { bg: 'bg-purple-100', text: 'text-purple-700' },
      '教育': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      '娱乐': { bg: 'bg-pink-100', text: 'text-pink-700' },
      '体育': { bg: 'bg-red-100', text: 'text-red-700' },
    };
    return styles[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

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
            <div key={stat.label} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-gray-500">{stat.label}</div>
              {stat.description && (
                <div className="text-sm text-gray-400">{stat.description}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card p-6 col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary-600 rounded-full" />
              <h2 className="text-xl font-bold text-gray-800">快速操作</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className={`${action.color} p-6 rounded-xl text-white text-left hover:scale-105 transition-transform shadow-lg`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-lg mb-1">{action.title}</div>
                  <div className="text-sm text-white/80">{action.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-primary-600 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">新闻分类</h2>
          </div>
          
          <div className="space-y-3">
            {newsCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${cat.color}`}>{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary-600 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">最近处理</h2>
          </div>
          <button className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium">
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
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
              <div 
                key={task.id} 
                className="border border-gray-100 rounded-xl p-5 hover:border-primary-200 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleViewTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryStyle(task.category).bg} ${getCategoryStyle(task.category).text}`}>
                        {task.category}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${task.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {task.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2">
                      {task.titles.objective || task.content.substring(0, 60)}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {task.summary.substring(0, 120)}{task.summary.length > 120 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(task.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Newspaper className="w-4 h-4" />
                        {task.content.length} 字符
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-6 h-6 text-primary-500" />
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">覆盖率</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${task.quality.coverageRate || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-green-600">{task.quality.coverageRate || 0}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">偏离度</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${task.quality.titleDeviation && task.quality.titleDeviation > 20 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${task.quality.titleDeviation || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-yellow-600">{task.quality.titleDeviation || 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}