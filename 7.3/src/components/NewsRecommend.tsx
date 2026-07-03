import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, Network, TrendingUp, Sparkles, ChevronRight, Star } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface RecommendedNews {
  id: number;
  title: string;
  summary: string;
  source: string;
  original_url: string;
  published_at: string;
  category: string;
  content?: string;
  views: number;
  is_trending: boolean;
}

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'topic' | 'entity' | 'event';
  x: number;
  y: number;
}

interface KnowledgeGraphLink {
  source: string;
  target: string;
}

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

export function NewsRecommend() {
  const { summary, content, titles } = useStore();
  const [recommendations, setRecommendations] = useState<RecommendedNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState<{ nodes: KnowledgeGraphNode[], links: KnowledgeGraphLink[] }>({ nodes: [], links: [] });
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [selectedNews, setSelectedNews] = useState<RecommendedNews | null>(null);

  useEffect(() => {
    if (summary && content && titles.objective) {
      fetchRecommendations();
      generateKnowledgeGraph();
    } else {
      fetchDefaultRecommendations();
    }
  }, [summary, content, titles]);

  const fetchDefaultRecommendations = () => {
    setIsLoading(true);
    setTimeout(() => {
      const defaultNews: RecommendedNews[] = [
        {
          id: 1,
          title: 'AI技术突破：新一代大语言模型性能提升300%',
          summary: '最新发布的大语言模型在多项基准测试中取得了突破性进展，性能较上一代提升300%，同时能耗降低50%。该模型采用了全新的架构设计和训练方法，在自然语言理解、生成和推理能力方面都有显著提升。',
          source: '科技日报',
          original_url: '#',
          published_at: new Date().toISOString(),
          category: '科技',
          views: 12580,
          is_trending: true,
        },
        {
          id: 2,
          title: '全球股市震荡：美联储政策转向引发市场波动',
          summary: '美联储宣布调整货币政策后，全球股市出现剧烈震荡。分析师认为这是市场对未来利率走向不确定性的正常反应，建议投资者保持谨慎态度。',
          source: '财经时报',
          original_url: '#',
          published_at: new Date(Date.now() - 3600000).toISOString(),
          category: '财经',
          views: 8920,
          is_trending: true,
        },
        {
          id: 3,
          title: '冬季流感高发期：专家提醒做好防护措施',
          summary: '随着气温下降，冬季流感进入高发期。专家提醒市民注意保暖，勤洗手，及时接种流感疫苗，做好个人防护，减少感染风险。',
          source: '健康报',
          original_url: '#',
          published_at: new Date(Date.now() - 7200000).toISOString(),
          category: '健康',
          views: 7850,
          is_trending: false,
        },
        {
          id: 4,
          title: '教育部发布新规：中小学课后服务将全面升级',
          summary: '教育部近日发布通知，要求各地中小学进一步完善课后服务体系，丰富服务内容，提高服务质量，切实解决家长后顾之忧。',
          source: '教育新闻',
          original_url: '#',
          published_at: new Date(Date.now() - 10800000).toISOString(),
          category: '教育',
          views: 11200,
          is_trending: false,
        },
        {
          id: 5,
          title: '智能家居市场持续升温，AI助手成标配',
          summary: '智能家居市场持续快速增长，AI语音助手已成为智能家电的标准配置。消费者对智能化、便捷化生活的需求不断提升，推动行业创新发展。',
          source: '科技前沿',
          original_url: '#',
          published_at: new Date(Date.now() - 14400000).toISOString(),
          category: '科技',
          views: 9450,
          is_trending: false,
        },
      ];
      setRecommendations(defaultNews);
      setIsLoading(false);
    }, 500);
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);

    try {
      const keywords = extractKeywords(content + ' ' + summary + ' ' + titles.objective);
      const response = await fetch(`/api/news?keyword=${encodeURIComponent(keywords)}&page_size=5`);
      const result = await response.json();

      if (result.items && result.items.length > 0) {
        setRecommendations(result.items.slice(0, 5));
      } else {
        fetchDefaultRecommendations();
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      fetchDefaultRecommendations();
    } finally {
      setIsLoading(false);
    }
  };

  const generateKnowledgeGraph = () => {
    const keywords = extractKeywords(content + ' ' + summary);
    const keywordList = keywords.split(' ').filter(k => k.length >= 2);
    
    const nodes: KnowledgeGraphNode[] = [];
    const links: KnowledgeGraphLink[] = [];
    
    nodes.push({ id: 'topic', label: '主题', type: 'topic', x: 250, y: 180 });
    
    keywordList.slice(0, 8).forEach((keyword, index) => {
      const angle = (index * 45) * (Math.PI / 180);
      const radius = 140;
      const x = 250 + radius * Math.cos(angle);
      const y = 180 + radius * Math.sin(angle);
      nodes.push({ id: keyword, label: keyword, type: 'entity', x, y });
      links.push({ source: 'topic', target: keyword });
    });

    keywordList.slice(0, 4).forEach((keyword, index) => {
      if (index < keywordList.slice(0, 8).length - 1) {
        const nextKeyword = keywordList.slice(0, 8)[index + 1];
        links.push({ source: keyword, target: nextKeyword });
      }
    });

    setKnowledgeGraph({ nodes, links });
  };

  const extractKeywords = (text: string): string => {
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '新闻', '报道', '文章', '视频', '内容', '摘要', '生成', '标题'];
    
    const words = text.toLowerCase().match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      if (!stopWords.includes(word) && word.length >= 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word)
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return date.toLocaleDateString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'topic': return { fill: '#6366f1', stroke: '#4f46e5' };
      case 'entity': return { fill: '#10b981', stroke: '#059669' };
      case 'event': return { fill: '#f59e0b', stroke: '#d97706' };
      default: return { fill: '#6b7280', stroke: '#4b5563' };
    }
  };

  const trendingNews = recommendations.filter(n => n.is_trending);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">今日新闻推荐</h2>
            <p className="text-sm text-gray-500">基于内容智能推荐相关新闻</p>
          </div>
        </div>
        <button
          onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            showKnowledgeGraph 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Network className="w-4 h-4" />
          {showKnowledgeGraph ? '隐藏知识图谱' : '查看知识图谱'}
        </button>
      </div>

      {showKnowledgeGraph && (
        <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
            <Network className="w-4 h-4 text-primary-600" />
            聚类知识图谱 - 基于当前内容分析
          </h3>
          <div className="flex justify-center">
            <svg width="500" height="360" className="overflow-visible">
              {knowledgeGraph.links.map((link, index) => {
                const source = knowledgeGraph.nodes.find(n => n.id === link.source);
                const target = knowledgeGraph.nodes.find(n => n.id === link.target);
                if (!source || !target) return null;
                return (
                  <g key={index}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#c7d2fe"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                    <circle
                      cx={source.x}
                      cy={source.y}
                      r="4"
                      fill="#818cf8"
                    />
                    <circle
                      cx={target.x}
                      cy={target.y}
                      r="4"
                      fill="#818cf8"
                    />
                  </g>
                );
              })}
              {knowledgeGraph.nodes.map(node => {
                const colors = getNodeColor(node.type);
                return (
                  <g 
                    key={node.id}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      e.currentTarget.querySelector('circle')?.setAttribute('r', '30');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.querySelector('circle')?.setAttribute('r', node.type === 'topic' ? '35' : '25');
                    }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === 'topic' ? '35' : '25'}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth="2"
                      className="transition-all duration-300"
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={node.type === 'topic' ? '14' : '12'}
                      fontWeight="500"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-indigo-500" />
              <span className="text-sm text-gray-600">主题</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">关联实体/关键词</span>
            </div>
          </div>
        </div>
      )}

      {trendingNews.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-800">热门推荐</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendingNews.map((news) => (
              <div
                key={news.id}
                onClick={() => setSelectedNews(news)}
                className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[news.category] || 'bg-gray-100 text-gray-700'}`}>
                        {news.category}
                      </span>
                      <span className="text-xs text-orange-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        热门
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                      {news.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {news.summary}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">{news.source}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {(news.views / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">正在智能分析并推荐相关新闻...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">相关新闻</h3>
            <span className="text-sm text-gray-400">({recommendations.length}条)</span>
          </div>
          <div className="space-y-3">
            {recommendations.map((news, index) => (
              <div
                key={news.id}
                onClick={() => setSelectedNews(news)}
                className="p-4 bg-white border border-gray-100 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      index < 3 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[news.category] || 'bg-gray-100 text-gray-700'}`}>
                        {news.category}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(news.published_at)}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 mb-1">
                      {news.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {news.summary}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{news.source}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {(news.views / 1000).toFixed(1)}k 阅读
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Newspaper className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 mb-2">暂无相关新闻推荐</p>
          <p className="text-sm text-gray-400">输入内容后将为您智能推荐相关新闻</p>
        </div>
      )}

      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-indigo-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[selectedNews.category] || 'bg-gray-100 text-gray-700'}`}>
                    {selectedNews.category}
                  </span>
                  {selectedNews.is_trending && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      热门
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">{selectedNews.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{selectedNews.source}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(selectedNews.published_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {selectedNews.views.toLocaleString()} 阅读
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed text-lg">{selectedNews.summary}</p>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    window.open(selectedNews.original_url, '_blank');
                    setSelectedNews(null);
                  }}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  阅读原文
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}