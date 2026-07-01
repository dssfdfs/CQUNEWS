import { useState } from 'react';
import { Type, RefreshCw, Copy, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { generateTitles } from '@/api/deepseek';

export function TitleOutput() {
  const { titles, setTitles, content, language, setIsGenerating } = useStore();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const titleTypes = [
    { id: 'objective', label: '客观纪实型标题', value: titles.objective, color: 'blue' },
    { id: 'dataHighlight', label: '数据亮点型标题', value: titles.dataHighlight, color: 'green' },
    { id: 'lightweight', label: '轻量化标题', value: titles.lightweight, color: 'purple' },
  ];

  const handleCopy = async (type: string, value: string) => {
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleRewrite = async (_type: string) => {
    if (!content) return;
    
    setIsGenerating(true);
    try {
      const newTitles = await generateTitles(content, language);
      setTitles(newTitles);
    } catch {
      console.error('Failed to regenerate titles');
    } finally {
      setIsGenerating(false);
    }
  };

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-primary-600 rounded-full" />
        <h2 className="text-xl font-bold text-gray-800">标题生成</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {titleTypes.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium px-2 py-1 rounded ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                {item.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRewrite(item.id)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors duration-200"
                  title="改写"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => handleCopy(item.id, item.value)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors duration-200"
                  title="复制"
                >
                  {copiedType === item.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            
            {item.value ? (
              <div className="w-full bg-gray-50 rounded-lg p-3 min-h-[60px] max-h-[120px] overflow-y-auto">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    setTitles({ ...titles, [item.id]: e.target.value });
                  }}
                  className="w-full text-gray-700 border-none outline-none bg-transparent"
                  readOnly={false}
                />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Type className={`w-8 h-8 ${iconColorClasses[item.color as keyof typeof iconColorClasses]} mx-auto mb-2 opacity-50`} />
                <p className="text-gray-400 text-sm">标题将在这里显示</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}