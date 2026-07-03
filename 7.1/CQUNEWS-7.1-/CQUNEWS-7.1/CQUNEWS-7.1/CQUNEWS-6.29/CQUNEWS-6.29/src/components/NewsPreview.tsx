import { useState } from 'react';
import { TrendingUp, Clock, Eye, Bookmark, ArrowRight, Search, Filter } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  time: string;
  views: number;
  trending: boolean;
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'AI技术突破：新型大语言模型性能提升300%',
    summary: '近日，某科技公司发布了新一代大语言模型，在多项基准测试中性能提升超过300%，引发业界广泛关注。该模型采用了全新的训练架构...',
    category: '科技',
    source: '科技日报',
    time: '2小时前',
    views: 12580,
    trending: true,
  },
  {
    id: '2',
    title: '全球经济复苏态势明显，多国GDP增速超预期',
    summary: '最新数据显示，全球主要经济体经济复苏态势明显，多个国家第二季度GDP增速超出市场预期。分析师认为，这主要得益于...',
    category: '财经',
    source: '财经时报',
    time: '4小时前',
    views: 8920,
    trending: false,
  },
  {
    id: '3',
    title: '2024年奥运会筹备工作进展顺利',
    summary: '2024年巴黎奥运会筹备工作进展顺利，各项场馆建设已完成90%以上。组委会表示，将确保奥运会如期举行，并提供一流的赛事体验...',
    category: '体育',
    source: '体育新闻',
    time: '6小时前',
    views: 6540,
    trending: false,
  },
  {
    id: '4',
    title: '新能源汽车销量创历史新高',
    summary: '据最新统计数据，今年上半年新能源汽车销量创历史新高，同比增长超过150%。政策支持和技术进步是推动这一增长的主要因素...',
    category: '科技',
    source: '汽车周刊',
    time: '8小时前',
    views: 15320,
    trending: true,
  },
  {
    id: '5',
    title: '医疗健康领域迎来数字化转型浪潮',
    summary: '随着人工智能和大数据技术的发展，医疗健康领域正迎来数字化转型浪潮。智能诊断、远程医疗等新技术正在改变传统医疗模式...',
    category: '健康',
    source: '健康报',
    time: '10小时前',
    views: 4280,
    trending: false,
  },
];

const categories = ['全部', '科技', '财经', '体育', '娱乐', '时政', '健康'];

export function NewsPreview() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const filteredNews = mockNews.filter((item) => {
    const matchCategory = selectedCategory === '全部' || item.category === selectedCategory;
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const toggleBookmark = (id: string) => {
    const newBookmarked = new Set(bookmarked);
    if (newBookmarked.has(id)) {
      newBookmarked.delete(id);
    } else {
      newBookmarked.add(id);
    }
    setBookmarked(newBookmarked);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">今日新闻速览</h1>
          <p className="text-gray-500 mt-1">实时获取最新热点资讯</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            热点
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索新闻..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {filteredNews.map((news) => (
          <div
            key={news.id}
            className="card p-5 hover:shadow-md transition-all cursor-pointer group"
          >
            {news.trending && (
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                  热门
                </span>
                <span className="text-xs text-gray-400">{news.category}</span>
              </div>
            )}
            
            <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {news.title}
            </h3>
            
            <p className="text-gray-500 text-sm mb-4 line-clamp-3">
              {news.summary}
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {news.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {news.time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(news.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    bookmarked.has(news.id)
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-400 hover:text-yellow-600'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked.has(news.id) ? 'fill-current' : ''}`} />
                </button>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-16 h-16 mx-auto mb-4" />
          <p>没有找到相关新闻</p>
          <p className="text-sm mt-1">请尝试其他搜索关键词或分类</p>
        </div>
      )}
    </div>
  );
}