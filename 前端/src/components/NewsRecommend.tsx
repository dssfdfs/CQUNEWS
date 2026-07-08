import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Clock, Network, TrendingUp, Sparkles, ChevronRight, Star, ExternalLink, ArrowRight } from 'lucide-react';
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
  type: 'topic' | 'entity' | 'attribute';
  x: number;
  y: number;
  size: number;
  weight: number;
  cluster: number;
}

interface KnowledgeGraphLink {
  source: string;
  target: string;
  label?: string;
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
  const { summary, content, titles, history } = useStore();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendedNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState<{ nodes: KnowledgeGraphNode[], links: KnowledgeGraphLink[] }>({ nodes: [], links: [] });
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [relatedNews, setRelatedNews] = useState<RecommendedNews[]>([]);

  const getCategory = () => {
    if (history.length > 0) {
      return history[0].category;
    }
    return '';
  };

  useEffect(() => {
    if (summary && content && titles.objective) {
      fetchRecommendations();
      generateKnowledgeGraph();
    } else {
      fetchDefaultRecommendations();
    }
  }, [summary, content, titles, history]);

  const fetchRelatedNews = async (keyword: string) => {
    try {
      const response = await fetch(`/api/news?keyword=${encodeURIComponent(keyword)}&page_size=5`);
      const result = await response.json();
      if (result.items && result.items.length > 0) {
        setRelatedNews(result.items.slice(0, 5));
      } else {
        setRelatedNews([]);
      }
    } catch (error) {
      console.error('Failed to fetch related news:', error);
      setRelatedNews([]);
    }
  };

  useEffect(() => {
    if (selectedNode) {
      fetchRelatedNews(selectedNode);
    } else {
      setRelatedNews([]);
    }
  }, [selectedNode]);

  const fetchDefaultRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/news?page_size=5');
      const result = await response.json();
      if (result.items && result.items.length > 0) {
        setRecommendations(result.items.slice(0, 5));
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch default recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);

    try {
      const category = getCategory();
      let url = '/api/news?page_size=5';
      
      if (category && category !== '综合') {
        url = `/api/news?category=${encodeURIComponent(category)}&page_size=5`;
      } else {
        const keywords = extractKeywords(content + ' ' + summary + ' ' + titles.objective);
        const keywordStr = keywords.map(k => k.word).join(' ');
        url = `/api/news?keyword=${encodeURIComponent(keywordStr)}&page_size=5`;
      }
      
      const response = await fetch(url);
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

  const clusterKeywords = (keywords: Array<{ word: string; weight: number; position: number }>): Array<{ word: string; weight: number; position: number; cluster: number }> => {
    const clusters: Record<string, number> = {};
    const clusterKeywordsList: Array<{ word: string; weight: number; position: number; cluster: number }> = [];
    
    const synonymGroups = [
      ['科技', '技术', '互联网', '人工智能', 'AI', '智能', '数据', '数字化'],
      ['经济', '金融', '市场', '企业', '公司', '投资', '股票', '贸易'],
      ['政策', '政府', '国家', '中国', '国际', '外交', '合作', '发展'],
      ['教育', '学校', '学生', '教师', '学习', '培训', '课程', '考试'],
      ['健康', '医疗', '医院', '医生', '疾病', '疫苗', '营养', '身体'],
      ['环境', '气候', '能源', '环保', '绿色', '可持续', '生态'],
      ['文化', '艺术', '历史', '传统', '遗产', '博物馆', '文学'],
      ['体育', '运动', '比赛', '奥运会', '足球', '篮球', '健身'],
      ['娱乐', '电影', '音乐', '明星', '综艺', '演出', '节目'],
    ];

    let currentCluster = 0;
    keywords.forEach(keyword => {
      let foundCluster = -1;
      for (let i = 0; i < synonymGroups.length; i++) {
        const group = synonymGroups[i];
        if (group.some(synonym => keyword.word.includes(synonym) || synonym.includes(keyword.word))) {
          foundCluster = i;
          break;
        }
      }
      
      if (foundCluster === -1) {
        foundCluster = currentCluster + synonymGroups.length;
        currentCluster++;
      }
      
      clusterKeywordsList.push({ ...keyword, cluster: foundCluster });
      clusters[keyword.word] = foundCluster;
    });

    return clusterKeywordsList;
  };

  const generateKnowledgeGraph = () => {
    const keywords = extractKeywords(content + ' ' + summary);
    const clusteredKeywords = clusterKeywords(keywords);
    
    const nodes: KnowledgeGraphNode[] = [];
    const links: KnowledgeGraphLink[] = [];
    
    const centerX = 250;
    const centerY = 180;
    
    const topicLabel = titles.objective || '新闻主题';
    nodes.push({ id: 'topic', label: topicLabel, type: 'topic', x: centerX, y: centerY, size: 45, weight: 100, cluster: -1 });
    
    const entityKeywords = clusteredKeywords.slice(0, 4);
    const attributeKeywords = clusteredKeywords.slice(4, 8);
    
    const relationLabels = ['相关', '包含', '涉及', '关联'];
    const attributeRelationLabels = ['属性', '特征', '描述', '标签'];
    
    entityKeywords.forEach((keyword, index) => {
      const angle = (index * 90) * (Math.PI / 180);
      const radius = 130;
      const variance = (Math.random() - 0.5) * 20;
      const x = centerX + (radius + variance) * Math.cos(angle);
      const y = centerY + (radius + variance) * Math.sin(angle);
      const size = 28 + (keyword.weight / 15);
      
      nodes.push({ 
        id: keyword.word, 
        label: keyword.word, 
        type: 'entity', 
        x, y, 
        size: Math.min(size, 32), 
        weight: Math.round(keyword.weight),
        cluster: keyword.cluster
      });
      links.push({ 
        source: 'topic', 
        target: keyword.word,
        label: relationLabels[index % relationLabels.length]
      });
      
      const attributesForEntity = attributeKeywords.filter((_, i) => i % entityKeywords.length === index);
      attributesForEntity.forEach((attr, attrIndex) => {
        const attrAngle = angle + (attrIndex - 0.5) * 0.5;
        const attrRadius = radius + 80 + Math.random() * 20;
        const attrX = centerX + attrRadius * Math.cos(attrAngle);
        const attrY = centerY + attrRadius * Math.sin(attrAngle);
        
        nodes.push({ 
          id: attr.word, 
          label: attr.word, 
          type: 'attribute', 
          x: attrX, 
          y: attrY, 
          size: 20, 
          weight: Math.round(attr.weight),
          cluster: keyword.cluster
        });
        links.push({ 
          source: keyword.word, 
          target: attr.word,
          label: attributeRelationLabels[attrIndex % attributeRelationLabels.length]
        });
      });
    });

    setKnowledgeGraph({ nodes, links });
  };

  const extractKeywords = (text: string): Array<{ word: string; weight: number; position: number }> => {
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '新闻', '报道', '文章', '视频', '内容', '摘要', '生成', '标题', '可以', '需要', '进行', '问题', '情况', '工作', '相关', '发展', '重要', '研究', '分析', '表示', '指出', '认为', '建议', '应该', '可能', '已经', '正在', '将会', '通过', '根据', '按照', '以及', '对于', '关于', '由于', '如果', '虽然', '但是', '因此', '而且', '同时', '另外', '比如', '例如', '包括', '等等', '这个', '那个', '这样', '那样', '如何', '什么', '哪里', '为什么', '因为', '所以'];
    
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const wordInfo: Record<string, { count: number; positions: number[] }> = {};
    
    words.forEach((word, index) => {
      if (!stopWords.includes(word) && word.length >= 2) {
        if (!wordInfo[word]) {
          wordInfo[word] = { count: 0, positions: [] };
        }
        wordInfo[word].count++;
        wordInfo[word].positions.push(index);
      }
    });

    const scoredWords = Object.entries(wordInfo).map(([word, info]) => {
      const positionScore = info.positions.reduce((sum, pos) => {
        return sum + (1 - pos / words.length) * 2;
      }, 0) / info.positions.length;
      const lengthBonus = word.length >= 3 ? 0.5 : 0;
      const weight = info.count * 3 + positionScore + lengthBonus;
      return { word, weight, position: info.positions[0] };
    });

    return scoredWords.sort((a, b) => b.weight - a.weight).slice(0, 12);
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

  const entityColors = [
    { fill: '#818cf8', stroke: '#6366f1', gradientId: 'entity0' },
    { fill: '#60a5fa', stroke: '#3b82f6', gradientId: 'entity1' },
    { fill: '#a5b4fc', stroke: '#818cf8', gradientId: 'entity2' },
    { fill: '#c7d2fe', stroke: '#a5b4fc', gradientId: 'entity3' },
    { fill: '#a78bfa', stroke: '#8b5cf6', gradientId: 'entity4' },
    { fill: '#c4b5fd', stroke: '#a78bfa', gradientId: 'entity5' },
    { fill: '#6366f1', stroke: '#4f46e5', gradientId: 'entity6' },
    { fill: '#4f46e5', stroke: '#4338ca', gradientId: 'entity7' },
    { fill: '#3b82f6', stroke: '#2563eb', gradientId: 'entity8' },
  ];

  const attributeColors = [
    { fill: '#e0e7ff', stroke: '#a5b4fc', gradientId: 'attr0' },
    { fill: '#c7d2fe', stroke: '#818cf8', gradientId: 'attr1' },
    { fill: '#ede9fe', stroke: '#a78bfa', gradientId: 'attr2' },
    { fill: '#e0e7ff', stroke: '#a5b4fc', gradientId: 'attr3' },
    { fill: '#c7d2fe', stroke: '#818cf8', gradientId: 'attr4' },
    { fill: '#ede9fe', stroke: '#a78bfa', gradientId: 'attr5' },
    { fill: '#e0e7ff', stroke: '#a5b4fc', gradientId: 'attr6' },
    { fill: '#c7d2fe', stroke: '#818cf8', gradientId: 'attr7' },
    { fill: '#ede9fe', stroke: '#a78bfa', gradientId: 'attr8' },
  ];

  const getNodeColor = (type: string, cluster: number = 0) => {
    if (type === 'topic') {
      return { fill: '#6366f1', stroke: '#4f46e5', gradientId: 'topicGradient', textColor: '#ffffff' };
    }
    if (type === 'attribute') {
      const color = attributeColors[cluster % attributeColors.length];
      return { ...color, textColor: '#4f46e5' };
    }
    const color = entityColors[cluster % entityColors.length];
    return { ...color, textColor: '#ffffff' };
  };

  const trendingNews = recommendations.filter(n => n.is_trending);
  const showKnowledgeGraphButton = content.length >= 100;

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
        {showKnowledgeGraphButton && (
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
        )}
      </div>

      {showKnowledgeGraph && (
        <div className="mb-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-6">
            <Network className="w-5 h-5 text-indigo-600" />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">关联聚类知识图谱</span>
            <span className="text-sm font-normal text-gray-400">- 点击节点查看详情</span>
          </h3>
          <div className="flex justify-center relative">
            <svg width="500" height="400" className="overflow-visible">
              <defs>
                <radialGradient id="topicGradient" cx="40%" cy="40%">
                  <stop offset="0%" stopColor="#a5b4fc" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </radialGradient>
                {entityColors.map((color, index) => (
                  <radialGradient key={`entity-${index}`} id={color.gradientId} cx="40%" cy="40%">
                    <stop offset="0%" stopColor={color.fill} />
                    <stop offset="50%" stopColor={color.stroke} />
                    <stop offset="100%" stopColor={color.stroke} />
                  </radialGradient>
                ))}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-sm">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.6"/>
                  <stop offset="50%" stopColor="#818cf8" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.6"/>
                </linearGradient>
              </defs>
              <circle cx="250" cy="200" r="180" fill="#6366f1" fillOpacity="0.03" />
              <circle cx="250" cy="200" r="130" fill="#818cf8" fillOpacity="0.05" />
              {knowledgeGraph.links.map((link, index) => {
                const source = knowledgeGraph.nodes.find(n => n.id === link.source);
                const target = knowledgeGraph.nodes.find(n => n.id === link.target);
                if (!source || !target) return null;
                
                const isMain = source.id === 'topic';
                const isAttributeLink = target.type === 'attribute';
                
                return (
                  <g key={index}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isMain ? 'url(#lineGradient)' : '#c7d2fe'}
                      strokeWidth={isMain ? '2.5' : '1.5'}
                      strokeDasharray={isAttributeLink ? '6,4' : 'none'}
                      className="transition-all duration-500"
                      style={{
                        opacity: isMain ? 0.8 : 0.6,
                      }}
                    />
                    {link.label && (
                      <g>
                        <rect
                          x={(source.x + target.x) / 2 - 25}
                          y={(source.y + target.y) / 2 - 12}
                          width={50}
                          height={20}
                          rx={10}
                          fill="#f0f1ff"
                          stroke="#a5b4fc"
                          strokeWidth="1"
                        />
                        <text
                          x={(source.x + target.x) / 2}
                          y={(source.y + target.y) / 2 + 4}
                          textAnchor="middle"
                          fill="#4f46e5"
                          fontSize="10"
                          fontWeight="500"
                          className="pointer-events-none"
                        >
                          {link.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {knowledgeGraph.nodes.map((node) => {
                const colors = getNodeColor(node.type, node.cluster);
                const isTopic = node.type === 'topic';
                const isAttribute = node.type === 'attribute';
                const isSelected = selectedNode === node.id;
                const displaySize = isSelected ? node.size * 1.4 : node.size;
                return (
                  <g 
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={displaySize + 15}
                      fill={colors.fill}
                      fillOpacity={isSelected ? 0.15 : (isAttribute ? 0.05 : 0.08)}
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={displaySize}
                      fill={isTopic ? `url(#${colors.gradientId})` : (isAttribute ? colors.fill : `url(#${colors.gradientId})`)}
                      stroke={colors.stroke}
                      strokeWidth={isSelected ? '3' : (isAttribute ? '1.5' : '2')}
                      filter={isTopic ? "url(#glow)" : (isAttribute ? "none" : "url(#glow-sm)")}
                      className="transition-all duration-300"
                    />
                    {isTopic && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={displaySize - 8}
                        fill="white"
                        fillOpacity="0.08"
                      />
                    )}
                    {isAttribute && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={displaySize - 2}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                    )}
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={colors.textColor || 'white'}
                      fontSize={Math.max(8, Math.min(14, (displaySize * 1.4) / Math.max(1, node.label.length)))}
                      fontWeight="600"
                      className="pointer-events-none select-none transition-all duration-300"
                    >
                      {node.label.length > 6 ? node.label.slice(0, 5) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            {selectedNode && (
              <div
                className="absolute pointer-events-auto"
                style={{ zIndex: 9999, right: '0', bottom: '0' }}
              >
                {(() => {
                  const node = knowledgeGraph.nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  const isTopic = node.type === 'topic';
                  const isAttribute = node.type === 'attribute';
                  return (
                    <div
                      className="rounded-xl border-2 shadow-lg"
                      style={{
                        position: 'relative',
                        width: '280px',
                        backgroundColor: '#ffffff',
                        borderColor: '#818cf8',
                        padding: '12px',
                        boxSizing: 'border-box',
                        maxHeight: '400px',
                        overflowY: 'auto',
                      }}
                    >
                      <div
                        className="rounded-t-xl mb-3"
                        style={{
                          height: '6px',
                          background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
                        }}
                      />
                      <div
                        className="font-bold text-lg mb-2 text-center"
                        style={{ color: '#4f46e5', wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflow: 'hidden' }}
                      >
                        {node.label}
                      </div>
                      <div
                        className="text-sm text-center mb-2"
                        style={{ color: '#6366f1', wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflow: 'hidden' }}
                      >
                        {isTopic ? '主题节点' : isAttribute ? '属性标签' : '关联实体'}
                      </div>
                      <div
                        className="text-xs text-center mb-3 pb-3 border-b border-gray-100"
                        style={{ color: '#818cf8', wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflow: 'hidden' }}
                      >
                        权重: {node.weight} | 聚类: #{node.cluster + 1}
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Newspaper className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-semibold text-gray-700">关联新闻 ({relatedNews.length})</span>
                        </div>
                        {relatedNews.length > 0 ? (
                          <div className="space-y-2">
                            {relatedNews.map((newsItem, index) => (
                              <div
                                key={newsItem.id}
                                className="p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/news/${newsItem.id}`);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium text-indigo-600 mt-0.5">{index + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-800 font-medium line-clamp-2">
                                      {newsItem.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500">{newsItem.source}</span>
                                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-400">暂无关联新闻</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md" />
              <span className="text-xs font-medium text-indigo-700">主题节点</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 shadow-md" />
              <span className="text-xs font-medium text-blue-700">关联实体</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-full">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-300 bg-indigo-50" />
              <span className="text-xs font-medium text-indigo-600">属性标签</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full">
              <div className="w-6 h-1 bg-gradient-to-r from-blue-300 via-indigo-400 to-blue-300 rounded-full" />
              <span className="text-xs font-medium text-indigo-600">语义关联</span>
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
                onClick={() => navigate(`/news/${news.id}`)}
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
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 mb-3">
                      {news.title}
                    </h3>
                    <div className="flex items-center justify-between">
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
                onClick={() => navigate(`/news/${news.id}`)}
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
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                      {news.title}
                    </h3>
                    <div className="flex items-center justify-between">
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
    </div>
  );
}