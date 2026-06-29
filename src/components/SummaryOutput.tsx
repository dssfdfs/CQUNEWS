import { useState } from 'react';
import { FileText, Edit2, Save, Copy, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function SummaryOutput() {
  const { summary, setSummary } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-800">摘要生成</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              保存
            </button>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button onClick={handleCopy} className="btn-outline flex items-center gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            </>
          )}
        </div>
      </div>
      
      {summary ? (
        isEditing ? (
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="input-field h-48 resize-none text-gray-700"
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        )
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[200px]">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">摘要内容将在这里显示</p>
          <p className="text-gray-400 text-sm mt-1">请输入新闻内容并点击"一键生成"</p>
        </div>
      )}
    </div>
  );
}