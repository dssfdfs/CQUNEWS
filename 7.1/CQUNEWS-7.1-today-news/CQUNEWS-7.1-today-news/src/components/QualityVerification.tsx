import { Target, AlertTriangle, Eye } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function QualityVerification() {
  const { quality } = useStore();

  const metrics = [
    {
      id: 'coverage',
      label: '覆盖率检测',
      value: quality.coverageRate,
      unit: '%',
      icon: Target,
      color: quality.coverageRate >= 80 ? 'text-green-500' : quality.coverageRate >= 60 ? 'text-yellow-500' : 'text-red-500',
      bgColor: quality.coverageRate >= 80 ? 'bg-green-50' : quality.coverageRate >= 60 ? 'bg-yellow-50' : 'bg-red-50',
      ringColor: quality.coverageRate >= 80 ? 'text-green-500' : quality.coverageRate >= 60 ? 'text-yellow-500' : 'text-red-500',
    },
    {
      id: 'deviation',
      label: '标题偏离度',
      value: quality.titleDeviation,
      unit: '分',
      icon: AlertTriangle,
      color: quality.titleDeviation <= 20 ? 'text-green-500' : quality.titleDeviation <= 40 ? 'text-yellow-500' : 'text-red-500',
      bgColor: quality.titleDeviation <= 20 ? 'bg-green-50' : quality.titleDeviation <= 40 ? 'bg-yellow-50' : 'bg-red-50',
      ringColor: quality.titleDeviation <= 20 ? 'text-green-500' : quality.titleDeviation <= 40 ? 'text-yellow-500' : 'text-red-500',
    },
    {
      id: 'hallucination',
      label: '幻觉检测',
      value: quality.hallucinationCount,
      unit: '个',
      icon: Eye,
      color: quality.hallucinationCount === 0 ? 'text-green-500' : quality.hallucinationCount <= 2 ? 'text-yellow-500' : 'text-red-500',
      bgColor: quality.hallucinationCount === 0 ? 'bg-green-50' : quality.hallucinationCount <= 2 ? 'bg-yellow-50' : 'bg-red-50',
      ringColor: quality.hallucinationCount === 0 ? 'text-green-500' : quality.hallucinationCount <= 2 ? 'text-yellow-500' : 'text-red-500',
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((item) => {
          const Icon = item.icon;
          const maxValue = item.id === 'hallucination' ? 5 : 100;
          const ringWidth = getRingWidth(item.value, maxValue);
          
          return (
            <div key={item.id} className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${ringWidth * 3.52} 352`}
                    className={item.ringColor}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </span>
                  <span className="text-sm text-gray-500">{item.unit}</span>
                </div>
              </div>
              
              <div className={`mt-4 px-4 py-2 rounded-lg ${item.bgColor}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className={`font-medium ${item.color}`}>{item.label}</span>
                </div>
              </div>
              
              {item.id === 'deviation' && (
                <p className="text-xs text-gray-400 mt-2 text-center">分数越低越好</p>
              )}
              {item.id === 'hallucination' && (
                <p className="text-xs text-gray-400 mt-2 text-center">0个为最佳</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}