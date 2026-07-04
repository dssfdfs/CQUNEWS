import { useState, useEffect } from 'react';
import { TrendingUp, Clock, FileText, Sparkles, Search, Filter, ChevronRight, Star, Target } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface NewsItem {
  id: number;
  title: string;
  source: string;
  category: string;
  summary: string;
  views: number;
  isTrending: boolean;
  publishedAt: string;
}

export function HomePage() {
  const { history } = useStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [personalizedNews, setPersonalizedNews] = useState<NewsItem[]>([]);

  const categories = ['all', '科技', '财经', '体育', '娱乐', '时政', '健康', '教育', '生活'];

  const categoryColors: Record<string, string> = {
    '科技': 'bg-blue-100 text-blue-700',
    '财经': 'bg-green-100 text-green-700',
    '体育': 'bg-red-100 text-red-700',
    '娱乐': 'bg-purple-100 text-purple-700',
    '时政': 'bg-orange-100 text-orange-700',
    '健康': 'bg-teal-100 text-teal-700',
    '教育': 'bg-indigo-100 text-indigo-700',
    '生活': 'bg-pink-100 text-pink-700',
  };

  const extractUserInterests = () => {
    const categoryCounts: Record<string, number> = {};
    const keywords: Record<string, number> = {};

    history.forEach(item => {
      if (item.category && item.category !== '综合') {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }

      const text = item.content + ' ' + item.summary;
      const words = text.split(/[\s,，。！？、；：]+/).filter(w => w.length >= 2);
      words.forEach(word => {
        keywords[word] = (keywords[word] || 0) + 1;
      });
    });

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(item => item[0])
      .slice(0, 3);

    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .map(item => item[0])
      .slice(0, 5);

    return { topCategories, topKeywords };
  };

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const mockNews: NewsItem[] = [
          {
            id: 1,
            title: 'AI技术突破：新一代大语言模型性能提升300%',
            source: '科技日报',
            category: '科技',
            summary: '最新发布的大语言模型在多项基准测试中取得了突破性进展，性能较上一代提升300%，同时能耗降低50%。该模型采用了全新的架构设计和训练方法。',
            views: 12580,
            isTrending: true,
            publishedAt: '2024-01-15 09:30',
          },
          {
            id: 2,
            title: '全球股市震荡：美联储政策转向引发市场波动',
            source: '财经时报',
            category: '财经',
            summary: '美联储宣布调整货币政策后，全球股市出现剧烈震荡。分析师认为这是市场对未来利率走向不确定性的正常反应。',
            views: 8920,
            isTrending: true,
            publishedAt: '2024-01-15 08:45',
          },
          {
            id: 3,
            title: '国足晋级亚洲杯八强，创造历史最佳战绩',
            source: '体育新闻',
            category: '体育',
            summary: '中国国家男子足球队在亚洲杯淘汰赛中以2:1击败对手，成功晋级八强，创造了近年来亚洲杯的最佳战绩。',
            views: 25600,
            isTrending: true,
            publishedAt: '2024-01-14 22:00',
          },
          {
            id: 4,
            title: '春节档电影预售火爆，多部大片竞争激烈',
            source: '娱乐周刊',
            category: '娱乐',
            summary: '2024年春节档电影预售正式开启，多部备受期待的大片同步上线，首日预售票房突破5亿元，创历史新高。',
            views: 15300,
            isTrending: false,
            publishedAt: '2024-01-15 10:00',
          },
          {
            id: 5,
            title: '国务院发布新政策：进一步优化营商环境',
            source: '新华网',
            category: '时政',
            summary: '国务院近日发布《关于进一步优化营商环境的若干意见》，提出了20条具体措施，旨在激发市场活力和创造力。',
            views: 18900,
            isTrending: false,
            publishedAt: '2024-01-15 07:30',
          },
          {
            id: 6,
            title: '冬季流感高发期：专家提醒做好防护措施',
            source: '健康报',
            category: '健康',
            summary: '随着气温下降，冬季流感进入高发期。专家提醒市民注意保暖，勤洗手，及时接种流感疫苗，做好个人防护。',
            views: 7850,
            isTrending: false,
            publishedAt: '2024-01-15 11:00',
          },
          {
            id: 7,
            title: '教育部发布新规：中小学课后服务将全面升级',
            source: '教育新闻',
            category: '教育',
            summary: '教育部近日发布通知，要求各地中小学进一步完善课后服务体系，丰富服务内容，提高服务质量，切实解决家长后顾之忧。',
            views: 11200,
            isTrending: false,
            publishedAt: '2024-01-15 08:00',
          },
          {
            id: 8,
            title: '智能家居市场持续升温，AI助手成标配',
            source: '科技前沿',
            category: '科技',
            summary: '智能家居市场持续快速增长，AI语音助手已成为智能家电的标准配置。消费者对智能化、便捷化生活的需求不断提升。',
            views: 9450,
            isTrending: false,
            publishedAt: '2024-01-14 16:30',
          },
          {
            id: 9,
            title: '5G技术商用三年：改变生活的十大应用场景',
            source: '科技日报',
            category: '科技',
            summary: '5G商用三年来，已经在多个领域得到广泛应用，从远程医疗到智能交通，正在深刻改变我们的生活方式。',
            views: 14200,
            isTrending: false,
            publishedAt: '2024-01-14 14:00',
          },
          {
            id: 10,
            title: '数字人民币试点扩大，支付方式迎来变革',
            source: '财经时报',
            category: '财经',
            summary: '数字人民币试点范围进一步扩大，越来越多的城市和场景开始支持数字人民币支付，支付方式正在发生深刻变革。',
            views: 12800,
            isTrending: false,
            publishedAt: '2024-01-15 12:00',
          },
          {
            id: 11,
            title: '健康饮食新趋势：植物基食品市场快速增长',
            source: '健康报',
            category: '健康',
            summary: '随着健康意识的提升，植物基食品市场正在快速增长，越来越多的消费者开始关注健康饮食和可持续发展。',
            views: 8560,
            isTrending: false,
            publishedAt: '2024-01-15 09:00',
          },
          {
            id: 12,
            title: '人工智能教育应用：个性化学习成为可能',
            source: '教育新闻',
            category: '教育',
            summary: '人工智能技术正在改变传统教育模式，个性化学习系统能够根据每个学生的特点提供定制化的学习方案。',
            views: 10200,
            isTrending: false,
            publishedAt: '2024-01-14 18:00',
          },
        ];
        setNews(mockNews);

        const { topCategories } = extractUserInterests();
        if (topCategories.length > 0) {
          const personalized = mockNews.filter(item => 
            topCategories.includes(item.category) && !item.isTrending
          ).slice(0, 4);
          setPersonalizedNews(personalized);
        } else {
          setPersonalizedNews(mockNews.filter(item => !item.isTrending).slice(0, 4));
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [history]);

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const trendingNews = news.filter(item => item.isTrending);
  const recentTasks = history.slice(0, 3);
  const { topCategories, topKeywords } = extractUserInterests();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">今日新闻速览</h1>
          <p className="text-gray-500 mt-1">今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-primary-700">AI 新闻助手</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索新闻..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? '全部分类' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {trendingNews.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-800">热门新闻</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {trendingNews.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="card p-5 cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-700'}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    热门
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{item.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {item.publishedAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && personalizedNews.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-800">为您推荐</h2>
            {topCategories.length > 0 && (
              <span className="text-sm text-gray-500">
                (基于您关注的{topCategories.join('、')})
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {personalizedNews.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="card p-4 cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-700'}`}>
                    {item.category}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{item.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.publishedAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-800">最新新闻</h2>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="flex justify-between">
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="card p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">没有找到相关新闻</p>
              <p className="text-sm text-gray-400 mt-1">尝试调整搜索关键词或筛选条件</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNews(item)}
                  className="card p-5 cursor-pointer hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className={`text-xs px-3 py-1.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-700'}`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 line-clamp-2 mb-3">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-400">
                          <span>{item.source}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {item.publishedAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {item.views.toLocaleString()}
                          </span>
                          <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-800">新闻分类</h2>
            </div>
            
            <div className="space-y-3">
              {categories.filter(c => c !== 'all').map((cat) => (
                <div
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCategory === cat ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${categoryColors[cat].replace('100', '500').replace('text-', '')}`}></span>
                    <span className="font-medium text-gray-700">{cat}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {news.filter(n => n.category === cat).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-800">最近处理</h2>
            </div>
            
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3" />
                <p className="text-sm">暂无处理记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                      {task.content.substring(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(task.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {topKeywords.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-purple-600 rounded-full" />
                <h2 className="text-lg font-bold text-gray-800">您感兴趣的话题</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {topKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-3 py-1.5 rounded-full ${categoryColors[selectedNews.category] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedNews.category}
                </span>
                {selectedNews.isTrending && (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    热门
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">{selectedNews.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{selectedNews.source}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedNews.publishedAt}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {selectedNews.views.toLocaleString()} 阅读
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-4">{selectedNews.summary}</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    完整内容请访问原网站查看。
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedNews(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}