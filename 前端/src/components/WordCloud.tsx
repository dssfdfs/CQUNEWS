import { useState, useEffect, useMemo } from 'react';
import { X, Users, MousePointerClick, Share2, TrendingUp } from 'lucide-react';

interface WordItem {
  text: string;
  value: number;
  category: string;
}

interface WordStats {
  word: string;
  total_users: number;
  user_percentage: number;
  click_count: number;
  view_count: number;
  share_count: number;
  generate_count: number;
  trend: 'up' | 'down' | 'stable';
}

interface WordCloudProps {
  words: WordItem[];
}

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  '科技': { primary: '#4f46e5', secondary: '#6366f1', glow: '#4f46e540' },
  '财经': { primary: '#ea580c', secondary: '#f97316', glow: '#ea580c40' },
  '体育': { primary: '#059669', secondary: '#10b981', glow: '#05966940' },
  '娱乐': { primary: '#be185d', secondary: '#ec4899', glow: '#be185d40' },
  '时政': { primary: '#7c3aed', secondary: '#8b5cf6', glow: '#7c3aed40' },
  '教育': { primary: '#0891b2', secondary: '#06b6d4', glow: '#0891b240' },
  '健康': { primary: '#16a34a', secondary: '#22c55e', glow: '#16a34a40' },
  '生活': { primary: '#d97706', secondary: '#f59e0b', glow: '#d9770640' },
  '其他': { primary: '#475569', secondary: '#64748b', glow: '#47556940' },
};

export function WordCloud({ words }: WordCloudProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<WordStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (selectedWord && wordStats?.word !== selectedWord) {
      fetchWordStats(selectedWord);
    }
  }, [selectedWord]);

  const fetchWordStats = async (word: string) => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/analytics/word-stats?word=${encodeURIComponent(word)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setWordStats(data);
    } catch (error) {
      console.error('Failed to fetch word stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleWordClick = (word: string) => {
    if (selectedWord === word) {
      setSelectedWord(null);
      setWordStats(null);
    } else {
      setSelectedWord(word);
    }
  };

  const sortedWords = useMemo(() => [...words].sort((a, b) => b.value - a.value), [words]);
  
  const maxValue = useMemo(() => sortedWords.length > 0 ? sortedWords[0].value : 1, [sortedWords]);
  const minValue = useMemo(() => sortedWords.length > 0 ? sortedWords[sortedWords.length - 1].value : 1, [sortedWords]);

  const layout = useMemo(() => {
    if (sortedWords.length === 0) return [];

    const result: Array<{
      word: WordItem;
      fontSize: number;
      x: number;
      y: number;
      rotation: number;
      zIndex: number;
      opacity: number;
    }> = [];

    const containerWidth = 500;
    const containerHeight = 500;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const placedBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];

    const estimateWordSize = (fontSize: number, text: string) => {
      const charWidth = fontSize * 0.95;
      const width = text.length * charWidth + 6;
      const height = fontSize + 4;
      return { width, height };
    };

    const checkCollision = (x: number, y: number, width: number, height: number, padding: number = 4) => {
      for (const box of placedBoxes) {
        if (
          x - width / 2 - padding < box.x + box.width / 2 &&
          x + width / 2 + padding > box.x - box.width / 2 &&
          y - height / 2 - padding < box.y + box.height / 2 &&
          y + height / 2 + padding > box.y - box.height / 2
        ) {
          return true;
        }
      }
      return false;
    };

    const isInsideBounds = (x: number, y: number, width: number, height: number) => {
      const margin = 10;
      return x - width / 2 >= margin && x + width / 2 <= containerWidth - margin &&
             y - height / 2 >= margin && y + height / 2 <= containerHeight - margin;
    };

    for (const word of sortedWords) {
      const logValue = Math.log(word.value + 1);
      const maxLogValue = Math.log(maxValue + 1);
      const minLogValue = Math.log(minValue + 1);
      
      const normalized = maxLogValue === minLogValue 
        ? 0.5 
        : (logValue - minLogValue) / (maxLogValue - minLogValue);
      
      const fontSize = Math.floor(14 + normalized * 42);
      const rotation = 0;
      const wordSize = estimateWordSize(fontSize, word.text);

      let x = centerX;
      let y = centerY;
      let placed = false;

      if (placedBoxes.length === 0) {
        x = centerX;
        y = centerY;
        placed = true;
      } else {
        const baseRadius = 15 + (1 - normalized) * 10;
        
        for (let ring = 0; ring < 15; ring++) {
          const ringRadius = baseRadius + ring * 18;
          const pointsPerRing = 8 + ring * 6;
          
          for (let i = 0; i < pointsPerRing; i++) {
            const angle = (i * 2 * Math.PI) / pointsPerRing + ring * 0.12;
            x = centerX + Math.cos(angle) * ringRadius;
            y = centerY + Math.sin(angle) * ringRadius;

            if (isInsideBounds(x, y, wordSize.width, wordSize.height) && 
                !checkCollision(x, y, wordSize.width, wordSize.height, 5)) {
              placed = true;
              break;
            }
          }
          
          if (placed) break;
        }

        if (!placed) {
          const searchRadius = containerWidth / 2 - 20;
          const step = 5;
          
          for (let r = 0; r < searchRadius; r += step) {
            for (let angleIdx = 0; angleIdx < 360; angleIdx += 8) {
              const angle = (angleIdx * Math.PI) / 180;
              x = centerX + Math.cos(angle) * r;
              y = centerY + Math.sin(angle) * r;

              if (isInsideBounds(x, y, wordSize.width, wordSize.height) && 
                  !checkCollision(x, y, wordSize.width, wordSize.height, 4)) {
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }

        if (!placed) {
          for (let attempt = 0; attempt < 2000; attempt++) {
            x = 10 + Math.random() * (containerWidth - 20);
            y = 10 + Math.random() * (containerHeight - 20);
            x = Math.max(wordSize.width / 2 + 10, Math.min(containerWidth - 10 - wordSize.width / 2, x));
            y = Math.max(wordSize.height / 2 + 10, Math.min(containerHeight - 10 - wordSize.height / 2, y));
            
            if (!checkCollision(x, y, wordSize.width, wordSize.height, 3)) {
              placed = true;
              break;
            }
          }
        }
      }

      if (!placed) {
        continue;
      }

      placedBoxes.push({ x, y, width: wordSize.width, height: wordSize.height });

      const zIndex = Math.floor((1 - normalized) * 50) + 10;
      const opacity = 0.75 + normalized * 0.25;

      result.push({
        word,
        fontSize,
        x: (x / containerWidth) * 100,
        y: (y / containerHeight) * 100,
        rotation,
        zIndex,
        opacity
      });
    }

    return result;
  }, [sortedWords, maxValue, minValue]);

  return (
    <div className="relative overflow-x-auto">
      <div
        className="w-[500px] max-w-full h-[500px] relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-gray-50 to-indigo-50/30 shadow-sm mx-auto"
        style={{ position: 'relative' }}
      >
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)`,
          }}
        />

        {layout.map((item, index) => {
          const colors = CATEGORY_COLORS[item.word.category] || CATEGORY_COLORS['其他'];
          const isSelected = selectedWord === item.word.text;
          const logValue = Math.log(item.word.value + 1);
          const maxLogValue = Math.log(maxValue + 1);
          const minLogValue = Math.log(minValue + 1);
          const normalizedSize = maxLogValue === minLogValue 
            ? 0.5 
            : (logValue - minLogValue) / (maxLogValue - minLogValue);
          const fontWeight = normalizedSize > 0.7 ? '800' : normalizedSize > 0.4 ? '700' : '500';

          return (
            <div
              key={`${item.word.text}-${index}`}
              className={`absolute cursor-pointer transition-all duration-200 ease-out ${
                isSelected ? 'scale-115' : 'hover:scale-105'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: isSelected ? 100 : item.zIndex,
                opacity: isSelected ? 1 : item.opacity,
              }}
              onClick={() => handleWordClick(item.word.text)}
            >
              <div
                className={`transition-all duration-200 ${
                  isSelected ? 'shadow-xl' : 'hover:shadow-md'
                }`}
                style={{
                  fontSize: `${item.fontSize}px`,
                  fontWeight,
                  color: isSelected ? colors.primary : colors.secondary,
                  textShadow: isSelected 
                    ? `0 0 15px ${colors.glow}, 0 3px 6px rgba(0,0,0,0.1)` 
                    : `0 2px 4px ${colors.glow}`,
                  whiteSpace: 'nowrap',
                  letterSpacing: normalizedSize > 0.7 ? '0.3px' : 'normal',
                }}
                title={`${item.word.text}\n分类: ${item.word.category}\n热度: ${item.word.value}次`}
              >
                {item.word.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 px-2">
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([category, colors]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.primary }}
              ></div>
              <span className="text-xs text-gray-500">{category}</span>
            </div>
          ))}
        </div>
        <span className="text-xs text-gray-400">点击词语查看详细统计</span>
      </div>

      {selectedWord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">用户行为统计分析</h3>
                  <p className="text-sm text-white/80 mt-1">关键词：{selectedWord}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedWord(null);
                    setWordStats(null);
                  }}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 mt-4">加载数据中...</p>
                </div>
              ) : wordStats ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">相关用户数</p>
                        <p className="text-2xl font-bold text-gray-800">{wordStats.total_users}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${wordStats.user_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{wordStats.user_percentage}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">占总用户比例</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <MousePointerClick className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-sm text-gray-500">点击次数</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{wordStats.click_count}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm text-gray-500">浏览次数</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{wordStats.view_count}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Share2 className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-sm text-gray-500">分享次数</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{wordStats.share_count}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="text-sm text-gray-500">生成摘要</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{wordStats.generate_count}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">趋势：</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        wordStats.trend === 'up'
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                          : wordStats.trend === 'down'
                          ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700'
                          : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700'
                      }`}
                    >
                      {wordStats.trend === 'up' ? '↑ 上升' : wordStats.trend === 'down' ? '↓ 下降' : '→ 稳定'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无统计数据</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  setSelectedWord(null);
                  setWordStats(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
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