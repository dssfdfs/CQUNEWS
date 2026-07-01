import { useState } from 'react';
import { Clock, Download, Trash2, Eye, Search, Calendar, Filter, RefreshCw, Edit3, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function History() {
  const { history, removeHistory, setContent, setSummary, setTitles, setQuality, setStep, setModel, updateHistory } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof history[0] | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummaryContent, setEditSummaryContent] = useState('');

  const filteredHistory = history.filter((item) => {
    const matchSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDate = !selectedDate || 
                      new Date(item.createdAt).toLocaleDateString('zh-CN') === selectedDate;
    return matchSearch && matchDate;
  });

  const groupedHistory = filteredHistory.reduce((acc, item) => {
    const date = new Date(item.createdAt).toLocaleDateString('zh-CN');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof history>);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      removeHistory(id);
    }
  };

  const handleView = (item: typeof history[0]) => {
    setSelectedItem(item);
    setEditSummaryContent(item.summary);
    setEditingSummary(false);
    setIsDrawerOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    setEditingSummary(false);
    document.body.style.overflow = '';
  };

  const handleRegenerate = () => {
    if (selectedItem) {
      setContent(selectedItem.content);
      setSummary('');
      setTitles({ objective: '', dataHighlight: '', lightweight: '' });
      setQuality({ coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 });
      setStep(1);
      setModel('DeepSeek');
      handleCloseDrawer();
      window.dispatchEvent(new Event('navigate-to-summary'));
    }
  };

  const handleStartEdit = () => {
    setEditingSummary(true);
  };

  const handleSaveEdit = () => {
    if (selectedItem) {
      updateHistory(selectedItem.id, { summary: editSummaryContent });
      setSummary(editSummaryContent);
      setEditingSummary(false);
    }
  };

  const handleCancelEdit = () => {
    if (selectedItem) {
      setEditSummaryContent(selectedItem.summary);
    }
    setEditingSummary(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '科技': 'bg-blue-100 text-blue-700',
      '财经': 'bg-green-100 text-green-700',
      '教育': 'bg-purple-100 text-purple-700',
      '体育': 'bg-orange-100 text-orange-700',
      '国际': 'bg-red-100 text-red-700',
      '其他': 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors['其他'];
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">个人历史</h1>
          <p className="text-gray-500 mt-1">查看和管理您的处理记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field pl-12 pr-4"
            />
          </div>
        </div>
      </div>

      <div className="card">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4" />
            <p>暂无历史记录</p>
            <p className="text-sm mt-1">开始处理新闻后，记录会保存在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-primary-600 rounded-full" />
                  <span className="font-medium text-gray-600">{date}</span>
                  <span className="text-sm text-gray-400">({items.length}条记录)</span>
                </div>
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-lg overflow-hidden hover:border-primary-200 transition-colors"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                              <span className="text-xs text-gray-400">
                                {item.status}
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium line-clamp-2 mb-2">{item.content.substring(0, 150)}...</p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(item.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleView(item)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDrawerOpen && selectedItem && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={handleCloseDrawer}
          />
          
          <div className={`fixed top-0 right-0 h-full w-1/2 bg-white z-50 shadow-2xl transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">记录详情</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(selectedItem.category)}`}>
                      {selectedItem.category}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(selectedItem.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">原始内容</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-gray-700 text-sm leading-relaxed max-h-48 overflow-y-auto">
                    {selectedItem.content}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">生成的标题</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">客观纪实标题</span>
                      </div>
                      <p className="text-gray-800 text-sm">{selectedItem.titles.objective}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">数据亮点标题</span>
                      </div>
                      <p className="text-gray-800 text-sm">{selectedItem.titles.dataHighlight}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">轻量化标题</span>
                      </div>
                      <p className="text-gray-800 text-sm">{selectedItem.titles.lightweight}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">摘要内容</h3>
                    {!editingSummary && (
                      <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                  </div>
                  {editingSummary ? (
                    <div className="space-y-3">
                      <textarea
                        value={editSummaryContent}
                        onChange={(e) => setEditSummaryContent(e.target.value)}
                        className="input-field h-32 resize-none"
                        placeholder="请输入编辑后的摘要内容..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="btn-primary flex-1"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary flex-1"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-700 text-sm leading-relaxed">
                      {selectedItem.summary}
                    </div>
                  )}
                </div>
                
                {selectedItem.quality && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-3">质量指标</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-500">覆盖率</span>
                          <span className="text-sm font-medium text-gray-700">{selectedItem.quality.coverageRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all" 
                            style={{ width: `${selectedItem.quality.coverageRate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-500">标题偏离度</span>
                          <span className="text-sm font-medium text-gray-700">{selectedItem.quality.titleDeviation}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all" 
                            style={{ width: `${selectedItem.quality.titleDeviation}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">幻觉次数</span>
                          <span className={`text-sm font-medium ${selectedItem.quality.hallucinationCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {selectedItem.quality.hallucinationCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleRegenerate}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重新生成
                  </button>
                  <button
                    onClick={handleStartEdit}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    二次编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}