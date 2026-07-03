import { Shield, BookOpen, Heart, Link2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function QualityVerification() {
  const { quality } = useStore();

  const getScoreColor = (value: number) => {
    if (value >= 80) return { text: 'text-green-500', bg: 'bg-green-50', ring: 'text-green-500' };
    if (value >= 60) return { text: 'text-yellow-500', bg: 'bg-yellow-50', ring: 'text-yellow-500' };
    return { text: 'text-red-500', bg: 'bg-red-50', ring: 'text-red-500' };
  };

  const metrics = [
    {
      id: 'credibility',
      label: '新闻可信度',
      value: quality.credibility,
      unit: '分',
      icon: Shield,
      description: '信息来源可靠性、内容真实性、事实准确性',
      ...getScoreColor(quality.credibility),
    },
    {
      id: 'readability',
      label: '内容可读性',
      value: quality.readability,
      unit: '分',
      icon: BookOpen,
      description: '语言流畅度、逻辑清晰度、阅读体验',
      ...getScoreColor(quality.readability),
    },
    {
      id: 'engagement',
      label: '读者吸引力',
      value: quality.engagement,
      unit: '分',
      icon: Heart,
      description: '标题吸引力、内容趣味性、阅读兴趣',
      ...getScoreColor(quality.engagement),
    },
    {
      id: 'relevance',
      label: '主题相关性',
      value: quality.relevance,
      unit: '分',
      icon: Link2,
      description: '标题与内容匹配度、主题把握程度',
      ...getScoreColor(quality.relevance),
    },
  ];

  const getRingWidth = (value: number, max: number) => {
    const percentage = Math.min((value / max) * 100, 100);
    return percentage;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-primary-600 rounded-full" />
        <h2 className="text-xl font-bold text-gray-800">质量校验</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((item) => {
          const Icon = item.icon;
          const ringWidth = getRingWidth(item.value, 100);
          
          return (
            <div key={item.id} className="flex flex-col items-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${ringWidth * 3.02} 302`}
                    className={item.ring}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${item.text}`}>
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-500">{item.unit}</span>
                </div>
              </div>
              
              <div className={`mt-3 px-3 py-1.5 rounded-lg ${item.bg}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${item.text}`} />
                  <span className={`text-sm font-medium ${item.text}`}>{item.label}</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mt-2 text-center max-w-[140px]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}