import { useState } from 'react';
import { FileText, RefreshCw, Copy, Check, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function SummaryOutput() {
  const { summary, setSummary, content, setIsGenerating } = useStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRewrite = async () => {
    if (!content) return;
    
    setIsGenerating(true);
    setSummary('');
    window.dispatchEvent(new Event('generate-all'));
  };

  const handleDownload = () => {
    if (summary) {
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-800">摘要生成</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRewrite}
            className="btn-secondary flex items-center gap-2"
            disabled={!content}
          >
            <RefreshCw className="w-4 h-4" />
            重新生成
          </button>
          <button
            onClick={handleCopy}
            className="btn-outline flex items-center gap-2"
            disabled={!summary}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="btn-outline flex items-center gap-2"
            disabled={!summary}
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </div>
      
      {summary ? (
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full h-64 bg-gray-50 rounded-lg p-4 text-gray-700 border-none outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">摘要将在这里显示</p>
          <p className="text-gray-400 text-sm mt-2">请在上方输入新闻内容并点击"一键生成"</p>
        </div>
      )}
    </div>
  );
}
