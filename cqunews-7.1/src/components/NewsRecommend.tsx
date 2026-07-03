import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, Network } from 'lucide-react';
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

export function NewsRecommend() {
  const { summary, content, titles } = useStore();
  const [recommendations, setRecommendations] = useState<RecommendedNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState<{ nodes: KnowledgeGraphNode[], links: KnowledgeGraphLink[] }>({ nodes: [], links: [] });
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);

  useEffect(() => {
    if (summary && content && titles.objective) {
      fetchRecommendations();
      generateKnowledgeGraph();
    }
  }, [summary, content, titles]);

  const fetchRecommendations = async () => {
    setIsLoading(true);

    try {
      const keywords = extractKeywords(content + ' ' + summary + ' ' + titles.objective);
      const response = await fetch(`/api/news?keyword=${encodeURIComponent(keywords)}&page_size=5`);
      const result = await response.json();

      if (result.items && result.items.length > 0) {
        setRecommendations(result.items.slice(0, 5));
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateKnowledgeGraph = () => {
    const keywords = extractKeywords(content + ' ' + summary);
    const keywordList = keywords.split(' ').filter(k => k.length >= 2);
    
    const nodes: KnowledgeGraphNode[] = [];
    const links: KnowledgeGraphLink[] = [];
    
    nodes.push({ id: 'topic', label: '主题', type: 'topic', x: 200, y: 150 });
    
    keywordList.slice(0, 6).forEach((keyword, index) => {
      const angle = (index * 60) * (Math.PI / 180);
      const x = 200 + 120 * Math.cos(angle);
      const y = 150 + 120 * Math.sin(angle);
      nodes.push({ id: keyword, label: keyword, type: 'entity', x, y });
      links.push({ source: 'topic', target: keyword });
    });

    setKnowledgeGraph({ nodes, links });
  };

  const extractKeywords = (text: string): string => {
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '新闻', '报道', '文章', '视频', '内容', '摘要'];
    
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
      return date.toLocaleDateString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'topic': return { fill: '#3b82f6', stroke: '#2563eb' };
      case 'entity': return { fill: '#10b981', stroke: '#059669' };
      case 'event': return { fill: '#f59e0b', stroke: '#d97706' };
      default: return { fill: '#6b7280', stroke: '#4b5563' };
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-800">今日新闻推荐</h2>
        </div>
        <button
          onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Network className="w-4 h-4" />
            聚类知识图谱
          </h3>
          <svg width="400" height="300" className="mx-auto">
            {knowledgeGraph.links.map((link, index) => {
              const source = knowledgeGraph.nodes.find(n => n.id === link.source);
              const target = knowledgeGraph.nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              return (
                <line
                  key={index}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              );
            })}
            {knowledgeGraph.nodes.map(node => {
              const colors = getNodeColor(node.type);
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="25"
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="500"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">主题</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500">实体/关键词</span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">正在获取相关新闻...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((news) => (
            <div
              key={news.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
              onClick={() => window.open(news.original_url, '_blank')}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                      {news.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(news.published_at)}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                    {news.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                    {news.summary || news.content?.slice(0, 100)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{news.source}</span>
                    <span className="text-xs text-primary-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      阅读全文
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">暂无相关新闻推荐</p>
        </div>
      )}
    </div>
  );
}