import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Clock, Network, TrendingUp, Sparkles, ChevronRight, Star, RotateCcw, Crosshair } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

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

type EntityType = 'PERSON' | 'ORG' | 'GPE' | 'EVENT' | 'TECHNOLOGY' | 'PRODUCT' | 'OTHER';
type RelationType = '涉及' | '关联' | '位于' | '属于' | '发布' | '参与' | '合作' | '包含' | '主题词' | '摘要' | '推荐' | '特征' | '分类' | '标签';

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'topic' | 'news' | 'entity' | 'attribute';
  entityType?: EntityType;
  size: number;
  weight: number;
  cluster: number;
  newsId?: number;
  isRelevant?: boolean;
}

interface KnowledgeGraphLink {
  source: string;
  target: string;
  label?: string;
  weight: number;
  relationType?: RelationType;
}

interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
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
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphData>({ nodes: [], links: [] });
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (showKnowledgeGraph && knowledgeGraph.nodes.length > 0 && graphRef.current) {
      setTimeout(() => {
        const camera = graphRef.current.camera();
        if (camera) {
          camera.position.set(0, 0, 300);
          camera.lookAt(0, 0, 0);
        }
      }, 500);
    }
  }, [knowledgeGraph.nodes.length, showKnowledgeGraph]);

  useEffect(() => {
    if (showKnowledgeGraph) {
      generateKnowledgeGraph();
    }
  }, [showKnowledgeGraph]);

  useEffect(() => {
    if (showKnowledgeGraph && (content || summary)) {
      generateKnowledgeGraph();
    }
  }, [content, summary, showKnowledgeGraph]);

  const getCategory = () => {
    if (history.length > 0) {
      return history[0].category;
    }
    return '';
  };

  useEffect(() => {
    if (summary && content && titles.objective) {
      fetchRecommendations();
    } else {
      fetchDefaultRecommendations();
    }
  }, [summary, content, titles, history]);

  useEffect(() => {
    if (content || summary) {
      fetchDefaultRecommendations();
    }
  }, [content, summary]);

  useEffect(() => {
    generateKnowledgeGraph();
  }, [recommendations, summary, content, titles]);

  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  useEffect(() => {
    if (showKnowledgeGraph && knowledgeGraph.nodes.length > 0 && graphRef.current) {
      setTimeout(() => {
        graphRef.current.cameraPosition(
          { x: cameraX, y: cameraY, z: 1125 },
          { x: 0, y: 0, z: 0 },
          500
        );
      }, 500);
    }
  }, [knowledgeGraph, showKnowledgeGraph, cameraX, cameraY]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.cameraPosition(
        { x: cameraX, y: cameraY, z: 1125 },
        { x: 0, y: 0, z: 0 },
        200
      );
    }
  }, [cameraX, cameraY]);

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
        const keywords = extractKeywordsAndEntities(content + ' ' + summary + ' ' + titles.objective);
        const keywordStr = keywords.map((k: { word: string }) => k.word).join(' ');
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

  const identifyEntityType = (word: string): EntityType => {
    const orgPatterns = [
      /[\u4e00-\u9fa5]{2,}大学$/,
      /[\u4e00-\u9fa5]{2,}公司$/,
      /[\u4e00-\u9fa5]{2,}集团$/,
      /[\u4e00-\u9fa5]{2,}科技$/,
      /[\u4e00-\u9fa5]{2,}企业$/,
      /[\u4e00-\u9fa5]{2,}研究院$/,
      /[\u4e00-\u9fa5]{2,}研究所$/,
      /[\u4e00-\u9fa5]{2,}政府$/,
      /[\u4e00-\u9fa5]{2,}部门$/,
      /[\u4e00-\u9fa5]{2,}机构$/,
      /[\u4e00-\u9fa5]{2,}协会$/,
      /[\u4e00-\u9fa5]{2,}联盟$/,
      /[\u4e00-\u9fa5]{2,}基金会$/,
      /[\u4e00-\u9fa5]{2,}委员会$/,
      /[\u4e00-\u9fa5]{2,}银行$/,
      /[\u4e00-\u9fa5]{2,}医院$/,
      /[\u4e00-\u9fa5]{2,}学校$/,
      /[\u4e00-\u9fa5]{2,}学院$/,
    ];
    
    const gpePatterns = [
      /[\u4e00-\u9fa5]{2,}省$/,
      /[\u4e00-\u9fa5]{2,}市$/,
      /[\u4e00-\u9fa5]{2,}区$/,
      /[\u4e00-\u9fa5]{2,}县$/,
      /[\u4e00-\u9fa5]{2,}镇$/,
      /[\u4e00-\u9fa5]{2,}村$/,
      /[\u4e00-\u9fa5]{2,}国家$/,
      /[\u4e00-\u9fa5]{2,}州$/,
      /[\u4e00-\u9fa5]{2,}港$/,
      /[\u4e00-\u9fa5]{2,}澳$/,
      /[\u4e00-\u9fa5]{2,}岛$/,
      /[\u4e00-\u9fa5]{2,}山$/,
      /[\u4e00-\u9fa5]{2,}河$/,
      /[\u4e00-\u9fa5]{2,}湖$/,
      /[\u4e00-\u9fa5]{2,}海$/,
      /[\u4e00-\u9fa5]{2,}江$/,
    ];
    
    const eventPatterns = [
      /[\u4e00-\u9fa5]{2,}大会$/,
      /[\u4e00-\u9fa5]{2,}会议$/,
      /[\u4e00-\u9fa5]{2,}峰会$/,
      /[\u4e00-\u9fa5]{2,}论坛$/,
      /[\u4e00-\u9fa5]{2,}展览$/,
      /[\u4e00-\u9fa5]{2,}赛事$/,
      /[\u4e00-\u9fa5]{2,}活动$/,
      /[\u4e00-\u9fa5]{2,}计划$/,
      /[\u4e00-\u9fa5]{2,}项目$/,
      /[\u4e00-\u9fa5]{2,}工程$/,
      /[\u4e00-\u9fa5]{2,}行动$/,
      /[\u4e00-\u9fa5]{2,}改革$/,
      /[\u4e00-\u9fa5]{2,}政策$/,
    ];
    
    const techPatterns = [
      /[\u4e00-\u9fa5]{2,}技术$/,
      /[\u4e00-\u9fa5]{2,}系统$/,
      /[\u4e00-\u9fa5]{2,}平台$/,
      /[\u4e00-\u9fa5]{2,}算法$/,
      /[\u4e00-\u9fa5]{2,}模型$/,
      /[\u4e00-\u9fa5]{2,}框架$/,
      /[\u4e00-\u9fa5]{2,}协议$/,
      /[\u4e00-\u9fa5]{2,}标准$/,
      /[\u4e00-\u9fa5]{2,}芯片$/,
      /[\u4e00-\u9fa5]{2,}软件$/,
      /[\u4e00-\u9fa5]{2,}硬件$/,
      /[A-Za-z]{3,}/,
    ];
    
    const personIndicators = ['先生', '女士', '博士', '教授', '专家', '经理', '主任', '书记', '主席', '局长', '院长'];
    
    if (orgPatterns.some(p => p.test(word))) return 'ORG';
    if (gpePatterns.some(p => p.test(word))) return 'GPE';
    if (eventPatterns.some(p => p.test(word))) return 'EVENT';
    if (techPatterns.some(p => p.test(word))) return 'TECHNOLOGY';
    if (personIndicators.some(indicator => word.includes(indicator))) return 'PERSON';
    
    return 'OTHER';
  };

  const extractKeywordsAndEntities = (text: string, newsId?: number): Array<{ word: string; weight: number; position: number; type: 'entity' | 'attribute'; entityType?: EntityType; newsId?: number; cluster?: number }> => {
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '新闻', '报道', '文章', '视频', '内容', '摘要', '生成', '标题', '可以', '需要', '进行', '问题', '情况', '工作', '相关', '发展', '重要', '研究', '分析', '表示', '指出', '认为', '建议', '应该', '可能', '已经', '正在', '将会', '通过', '根据', '按照', '以及', '对于', '关于', '由于', '如果', '虽然', '但是', '因此', '而且', '同时', '另外', '比如', '例如', '包括', '等等', '这个', '那个', '这样', '那样', '如何', '什么', '哪里', '为什么', '因为', '所以'];
    
    const entityPatterns = [
      /[\u4e00-\u9fa5]{2,}大学/g,
      /[\u4e00-\u9fa5]{2,}公司/g,
      /[\u4e00-\u9fa5]{2,}集团/g,
      /[\u4e00-\u9fa5]{2,}科技/g,
      /[\u4e00-\u9fa5]{2,}企业/g,
      /[\u4e00-\u9fa5]{2,}研究院/g,
      /[\u4e00-\u9fa5]{2,}研究所/g,
      /[\u4e00-\u9fa5]{2,}政府/g,
      /[\u4e00-\u9fa5]{2,}部门/g,
      /[\u4e00-\u9fa5]{2,}机构/g,
      /[\u4e00-\u9fa5]{2,}协会/g,
      /[\u4e00-\u9fa5]{2,}会议/g,
      /[\u4e00-\u9fa5]{2,}峰会/g,
      /[\u4e00-\u9fa5]{2,}论坛/g,
      /[\u4e00-\u9fa5]{2,}展览/g,
      /[\u4e00-\u9fa5]{2,}赛事/g,
      /[\u4e00-\u9fa5]{2,}政策/g,
      /[\u4e00-\u9fa5]{2,}计划/g,
      /[\u4e00-\u9fa5]{2,}项目/g,
      /[\u4e00-\u9fa5]{2,}工程/g,
      /[\u4e00-\u9fa5]{2,}技术/g,
      /[\u4e00-\u9fa5]{2,}系统/g,
      /[\u4e00-\u9fa5]{2,}平台/g,
      /[\u4e00-\u9fa5]{2,}算法/g,
      /[\u4e00-\u9fa5]{2,}模型/g,
      /[\u4e00-\u9fa5]{2,}省/g,
      /[\u4e00-\u9fa5]{2,}市/g,
      /[\u4e00-\u9fa5]{2,}国家/g,
      /[\u4e00-\u9fa5]{2,}区/g,
      /[\u4e00-\u9fa5]{2,}县/g,
      /[\u4e00-\u9fa5]{2,}港/g,
      /[\u4e00-\u9fa5]{2,}澳/g,
      /[\u4e00-\u9fa5]{2,}岛/g,
      /[\u4e00-\u9fa5]{2,}山/g,
      /[\u4e00-\u9fa5]{2,}河/g,
      /[\u4e00-\u9fa5]{2,}湖/g,
      /[\u4e00-\u9fa5]{2,}海/g,
      /[\u4e00-\u9fa5]{2,}江/g,
      /[\u4e00-\u9fa5]{2,}银行/g,
      /[\u4e00-\u9fa5]{2,}医院/g,
      /[\u4e00-\u9fa5]{2,}学校/g,
      /[\u4e00-\u9fa5]{2,}学院/g,
      /[\u4e00-\u9fa5]{2,}联盟/g,
      /[\u4e00-\u9fa5]{2,}基金会/g,
      /[\u4e00-\u9fa5]{2,}委员会/g,
      /[\u4e00-\u9fa5]{2,}行动/g,
      /[\u4e00-\u9fa5]{2,}改革/g,
      /[A-Za-z0-9]{3,}/g,
    ];

    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const wordInfo: Record<string, { count: number; positions: number[]; type: 'entity' | 'attribute'; entityType?: EntityType }> = {};
    
    entityPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!wordInfo[match]) {
            wordInfo[match] = { count: 0, positions: [], type: 'entity', entityType: identifyEntityType(match) };
          }
          wordInfo[match].count += 2;
          wordInfo[match].type = 'entity';
          wordInfo[match].entityType = identifyEntityType(match);
        });
      }
    });

    words.forEach((word, index) => {
      if (!stopWords.includes(word) && word.length >= 2) {
        if (!wordInfo[word]) {
          wordInfo[word] = { count: 0, positions: [], type: 'attribute', entityType: undefined };
        }
        wordInfo[word].count++;
        wordInfo[word].positions.push(index);
      }
    });

    const scoredWords = Object.entries(wordInfo).map(([word, info]) => {
      const positionScore = info.positions.length > 0 
        ? info.positions.reduce((sum, pos) => sum + (1 - pos / words.length) * 2, 0) / info.positions.length 
        : 0.5;
      const lengthBonus = word.length >= 3 ? 0.5 : 0;
      const entityBonus = info.type === 'entity' ? 1.0 : 0;
      const typeBonus = info.entityType === 'PERSON' || info.entityType === 'ORG' ? 0.5 : 0;
      const weight = info.count * 3 + positionScore + lengthBonus + entityBonus + typeBonus;
      return { word, weight, position: info.positions[0] || 0, type: info.type, entityType: info.entityType, newsId };
    });

    return scoredWords.sort((a, b) => b.weight - a.weight).slice(0, 12);
  };

  

  const generateKnowledgeGraph = async () => {
    const effectiveRecommendations = recommendations.length > 0 ? recommendations : [];
    const hasContent = content || summary;
    const nodes: KnowledgeGraphNode[] = [];
    const links: KnowledgeGraphLink[] = [];
    const nodeIds = new Set<string>();
    
    const topicLabel = titles.objective || '新闻主题';
    nodes.push({ id: 'topic', label: topicLabel, type: 'topic', size: 45, weight: 100, cluster: -1, isRelevant: true });
    nodeIds.add('topic');
    
    const contentKeywords = hasContent ? extractKeywordsAndEntities(content + ' ' + summary) : [];
    const contentKeywordSet = new Set(contentKeywords.map(k => k.word));
    
    const allNewsEntities: Record<string, { weight: number; entityType?: EntityType; newsIds: number[] }> = {};
    
    try {
      const response = await fetch('/api/news?page_size=100');
      const result = await response.json();
      const allNews = result.items || [];
      
      allNews.forEach((news: RecommendedNews) => {
        const text = `${news.title} ${news.summary || ''}`;
        const keywords = extractKeywordsAndEntities(text);
        keywords.forEach(kw => {
          if (!allNewsEntities[kw.word]) {
            allNewsEntities[kw.word] = { weight: 0, entityType: kw.entityType, newsIds: [] };
          }
          allNewsEntities[kw.word].weight += kw.weight;
          if (kw.entityType) {
            allNewsEntities[kw.word].entityType = kw.entityType;
          }
          if (!allNewsEntities[kw.word].newsIds.includes(news.id)) {
            allNewsEntities[kw.word].newsIds.push(news.id);
          }
        });
      });
    } catch (error) {
      console.error('Failed to fetch all news for knowledge graph:', error);
    }
    
    const newsNodes: KnowledgeGraphNode[] = [];
    effectiveRecommendations.forEach((news, index) => {
      const newsNodeId = `news-${news.id}`;
      newsNodes.push({
        id: newsNodeId,
        label: news.title.length > 12 ? news.title.slice(0, 11) + '...' : news.title,
        type: 'news',
        size: 26,
        weight: news.views || 100,
        cluster: index,
        newsId: news.id,
        isRelevant: true,
      });
      nodeIds.add(newsNodeId);
      
      links.push({
        source: 'topic',
        target: newsNodeId,
        label: '推荐',
        weight: 1,
        relationType: '推荐',
      });
    });
    nodes.push(...newsNodes);
    
    Object.entries(allNewsEntities).forEach(([word, info]) => {
      const size = Math.max(15, 20 + (info.weight / 25));
      const appearsInContent = contentKeywordSet.has(word);
      const appearsInRecommended = info.newsIds.some(id => effectiveRecommendations.some(r => r.id === id));
      const isRelevant = appearsInContent || appearsInRecommended;
      
      if (!nodeIds.has(word)) {
        nodes.push({
          id: word,
          label: word,
          type: 'entity',
          entityType: info.entityType,
          size: Math.min(size, 35),
          weight: Math.round(info.weight),
          cluster: info.newsIds.length,
          isRelevant,
        });
        nodeIds.add(word);
        
        links.push({
          source: 'topic',
          target: word,
          label: isRelevant ? '主题词' : '关联',
          weight: isRelevant ? 1 : 0.5,
          relationType: isRelevant ? '主题词' : '关联',
        });
      }
    });
    
    if (hasContent) {
      contentKeywords.forEach(cw => {
        if (nodeIds.has(cw.word)) {
          links.push({
            source: 'topic',
            target: cw.word,
            label: '摘要',
            weight: 1.2,
            relationType: '摘要',
          });
        }
      });
    }
    
    effectiveRecommendations.forEach(news => {
      const text = `${news.title} ${news.summary || ''}`;
      const newsKeywords = extractKeywordsAndEntities(text);
      newsKeywords.forEach(keyword => {
        if (keyword.type === 'entity' && nodeIds.has(keyword.word)) {
          const existingLink = links.find(l => 
            l.source === `news-${news.id}` && l.target === keyword.word
          );
          if (!existingLink) {
            links.push({
              source: `news-${news.id}`,
              target: keyword.word,
              label: '包含',
              weight: 0.8,
              relationType: '包含',
            });
          }
        }
      });
    });
    
    const entityPairs: Set<string> = new Set();
    Object.values(allNewsEntities).forEach(entity => {
      entity.newsIds.forEach(newsId => {
        const text = effectiveRecommendations.find(n => n.id === newsId)?.title || '';
        const newsKeywords = extractKeywordsAndEntities(text);
        newsKeywords.forEach(kw => {
          if (kw.type === 'entity' && kw.word !== Object.keys(allNewsEntities).find(k => allNewsEntities[k].newsIds.includes(newsId))) {
            const pair = [entity.newsIds, kw.word].sort().join('-');
            if (!entityPairs.has(pair)) {
              entityPairs.add(pair);
            }
          }
        });
      });
    });
    
    Object.entries(allNewsEntities).forEach(([source, sourceInfo]) => {
      Object.entries(allNewsEntities).forEach(([target, targetInfo]) => {
        if (source !== target && nodeIds.has(source) && nodeIds.has(target)) {
          const commonNews = sourceInfo.newsIds.filter(id => targetInfo.newsIds.includes(id));
          if (commonNews.length > 0) {
            const existingLink = links.find(l => 
              (l.source === source && l.target === target) ||
              (l.source === target && l.target === source)
            );
            if (!existingLink) {
              links.push({
                source,
                target,
                label: '关联',
                weight: commonNews.length * 0.5,
                relationType: '关联',
              });
            }
          }
        }
      });
    });
    
    setKnowledgeGraph({ nodes, links });
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
        <div className="mb-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Network className="w-5 h-5 text-indigo-600" />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">关联聚类知识图谱</span>
              <span className="text-sm font-normal text-gray-400">- 拖拽旋转 · 滚轮缩放 · 点击查看详情</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentNews = history.length > 0 ? history[0] : null;
                  if (currentNews && graphRef.current) {
                    const nodes = graphRef.current.graphData().nodes;
                    const newsNode = nodes.find((n: any) => n.newsId === currentNews.id);
                    if (newsNode) {
                      graphRef.current.cameraPosition(
                        { x: newsNode.x + 150, y: newsNode.y + 100, z: 200 },
                        { x: newsNode.x, y: newsNode.y, z: newsNode.z },
                        1000
                      );
                    }
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-xs font-medium text-indigo-600 transition-colors"
              >
                <Crosshair className="w-3 h-3" />
                定位当前新闻
              </button>
              <button
                onClick={() => graphRef.current?.d3Force('center')?.initialize && generateKnowledgeGraph()}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                重置视角
              </button>
              <div className="flex flex-col gap-1 ml-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">水平</span>
                  <input
                    type="range"
                    min="-1000"
                    max="1000"
                    value={cameraX}
                    onChange={(e) => setCameraX(Number(e.target.value))}
                    className="w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">垂直</span>
                  <input
                    type="range"
                    min="-1000"
                    max="1000"
                    value={cameraY}
                    onChange={(e) => setCameraY(Number(e.target.value))}
                    className="w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
          <div 
              className="relative h-[450px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50"
              tabIndex={0}
              autoFocus
              style={{ outline: 'none' }}
            >
            <ForceGraph3D
              ref={graphRef}
              graphData={knowledgeGraph}
              nodeLabel={(node) => node.label}
              nodeColor={(node) => {
                if (node.type === 'topic') return '#6366f1';
                if (node.type === 'news') return '#f59e0b';
                if (node.type === 'attribute') return node.isRelevant ? '#e0e7ff' : '#d1d5db';
                
                if (node.type === 'entity' && node.isRelevant === false) return '#d1d5db';
                
                if (node.entityType === 'PERSON') return '#ec4899';
                if (node.entityType === 'ORG') return '#6366f1';
                if (node.entityType === 'GPE') return '#10b981';
                if (node.entityType === 'EVENT') return '#f59e0b';
                if (node.entityType === 'TECHNOLOGY') return '#8b5cf6';
                if (node.entityType === 'PRODUCT') return '#06b6d4';
                return node.isRelevant === false ? '#d1d5db' : '#818cf8';
              }}
              nodeVal={(node) => node.size * (node.isRelevant === false ? 0.7 : 1)}
              nodeThreeObject={(node) => {
                const group = new THREE.Group();
                
                const baseSize = node.type === 'topic' ? 45 : (node.type === 'news' ? 26 : 20);
                const size = Math.max(baseSize, node.size * (node.isRelevant === false ? 0.7 : 1));
                const geometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
                const color = (() => {
                  if (node.type === 'topic') return '#6366f1';
                  if (node.type === 'news') return '#f59e0b';
                  if (node.type === 'attribute') return node.isRelevant ? '#e0e7ff' : '#d1d5db';
                  if (node.type === 'entity' && node.isRelevant === false) return '#d1d5db';
                  if (node.entityType === 'PERSON') return '#ec4899';
                  if (node.entityType === 'ORG') return '#6366f1';
                  if (node.entityType === 'GPE') return '#10b981';
                  if (node.entityType === 'EVENT') return '#f59e0b';
                  if (node.entityType === 'TECHNOLOGY') return '#8b5cf6';
                  if (node.entityType === 'PRODUCT') return '#06b6d4';
                  return node.isRelevant === false ? '#d1d5db' : '#818cf8';
                })();
                
                const material = new THREE.MeshStandardMaterial({ 
                  color: new THREE.Color(color),
                  emissive: new THREE.Color(color),
                  emissiveIntensity: 0.3,
                });
                const sphere = new THREE.Mesh(geometry, material);
                group.add(sphere);
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                const fontSize = Math.max(14, size * 0.5);
                ctx.font = `bold ${fontSize}px sans-serif`;
                const textWidth = ctx.measureText(node.label).width;
                canvas.width = textWidth + 20;
                canvas.height = fontSize + 10;
                
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#333333';
                ctx.fillText(node.label, canvas.width / 2, canvas.height / 2);
                
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.position.y = size * 0.5 + fontSize * 0.6;
                sprite.scale.set(canvas.width * 0.18, canvas.height * 0.18, 1);
                group.add(sprite);
                
                return group;
              }}
              linkColor={(link) => {
                const sourceNode = typeof link.source === 'object' ? link.source : knowledgeGraph.nodes.find(n => n.id === link.source);
                const targetNode = typeof link.target === 'object' ? link.target : knowledgeGraph.nodes.find(n => n.id === link.target);
                const isRelevant = sourceNode?.isRelevant !== false && targetNode?.isRelevant !== false;
                if (sourceNode?.type === 'topic') return isRelevant ? '#a5b4fc' : '#9ca3af';
                return isRelevant ? '#c7d2fe' : '#d1d5db';
              }}
              linkWidth={(link) => Math.max(1, link.weight * 0.5)}
              linkOpacity={0.6}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowColor="#818cf8"
              onNodeClick={(node) => {
                setSelectedNode(node.id === selectedNode ? null : node.id);
              }}
              onNodeHover={(node) => {
                if (node) {
                  document.body.style.cursor = 'pointer';
                } else {
                  document.body.style.cursor = 'default';
                }
              }}
              backgroundColor="#f8fafc"
            />
            {selectedNode && (
              <div
                className="absolute top-4 left-4 rounded-xl border-2 shadow-xl z-10"
                style={{
                  width: '240px',
                  backgroundColor: '#ffffff',
                  borderColor: '#818cf8',
                  padding: '14px',
                }}
              >
                {(() => {
                  const node = knowledgeGraph.nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  const isTopic = node.type === 'topic';
                  const isNews = node.type === 'news';
                  const isAttribute = node.type === 'attribute';
                  return (
                    <div>
                      <div
                        className="rounded-t-xl mb-3"
                        style={{
                          height: '6px',
                          background: isNews 
                            ? 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)'
                            : 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
                        }}
                      />
                      <div className="font-bold text-sm mb-2" style={{ color: isNews ? '#d97706' : '#4f46e5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {(() => {
                          if (isNews && node.newsId) {
                            const fullNews = recommendations.find(r => r.id === node.newsId);
                            return fullNews ? fullNews.title : node.label;
                          }
                          return node.label;
                        })()}
                      </div>
                      <div className="text-sm text-center mb-2" style={{ color: isNews ? '#f59e0b' : '#6366f1' }}>
                        {isTopic ? '主题节点' : isNews ? '推荐新闻' : isAttribute ? '属性标签' : '关联实体'}
                        {node.isRelevant === false && ' (无关)'}
                      </div>
                      {node.entityType && !isTopic && !isNews && !isAttribute && (
                        <div className="text-xs text-center mb-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#4b5563', display: 'inline-block', marginLeft: 'auto', marginRight: 'auto' }}>
                          {node.entityType === 'PERSON' ? '人物' : 
                           node.entityType === 'ORG' ? '机构' : 
                           node.entityType === 'GPE' ? '地点' : 
                           node.entityType === 'EVENT' ? '事件' : 
                           node.entityType === 'TECHNOLOGY' ? '技术' : 
                           node.entityType === 'PRODUCT' ? '产品' : '其他'}
                        </div>
                      )}
                      <div className="text-xs text-center" style={{ color: '#64748b' }}>
                        权重: {node.weight} | 聚类: #{node.cluster + 1}
                      </div>
                      {isNews && node.newsId && (
                        <div className="text-xs text-center mt-2 pt-2 border-t border-gray-100" style={{ color: '#9ca3af' }}>
                          新闻ID: {node.newsId}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md" />
              <span className="text-xs font-medium text-indigo-700">主题节点</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md" />
              <span className="text-xs font-medium text-amber-700">推荐新闻</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-rose-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-md" />
              <span className="text-xs font-medium text-rose-700">人物</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 shadow-md" />
              <span className="text-xs font-medium text-blue-700">机构</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-md" />
              <span className="text-xs font-medium text-green-700">地点</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 shadow-md" />
              <span className="text-xs font-medium text-violet-700">技术</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 shadow-md" />
              <span className="text-xs font-medium text-cyan-700">产品</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
              <div className="w-4 h-4 rounded-full bg-gray-300" />
              <span className="text-xs font-medium text-gray-600">无关实体</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-full">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-300 bg-indigo-50" />
              <span className="text-xs font-medium text-indigo-600">属性标签</span>
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
    </div>
  );
}