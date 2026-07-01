import { useState, useEffect, useRef } from 'react';
import { Clock, Download, Trash2, Eye, Search, Calendar, Filter, RefreshCw, Edit3, X, ChevronDown, Tag, CheckSquare, Square, Folder } from 'lucide-react';
import { useStore } from '@/store/useStore';
import JSZip from 'jszip';

const DATE_FILTERS = [
  { id: 'all', label: '全部时间' },
  { id: 'today', label: '今天' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'custom', label: '自定义' },
] as const;

const HISTORY_CATEGORIES = ['全部', '国际', '时政', '科技', '财经', '体育', '娱乐', '健康', '综合'] as const;

export function History() {
  const { history, removeHistory, setContent, setSummary, setTitles, setQuality, setStep, updateHistory } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]['id']>('all');
  const [customDate, setCustomDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof HISTORY_CATEGORIES)[number]>('全部');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof history[0] | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummaryContent, setEditSummaryContent] = useState('');
  const [savedSummary, setSavedSummary] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isThisWeek = (date: Date) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return date >= monday;
  };

  const isThisMonth = (date: Date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const filteredHistory = history.filter((item) => {
    const matchSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchDate = true;
    const itemDate = new Date(item.createdAt);
    const itemDateStr = itemDate.toISOString().split('T')[0];
    
    switch (dateFilter) {
      case 'today':
        matchDate = isToday(itemDate);
        break;
      case 'week':
        matchDate = isThisWeek(itemDate);
        break;
      case 'month':
        matchDate = isThisMonth(itemDate);
        break;
      case 'custom':
        matchDate = !customDate || itemDateStr === customDate;
        break;
    }
    
    const matchCategory = selectedCategory === '全部' || item.category === selectedCategory;
    
    return matchSearch && matchDate && matchCategory;
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
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleView = (item: typeof history[0]) => {
    setSelectedItem(item);
    setEditSummaryContent(item.summary);
    setSavedSummary(item.summary);
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
      handleCloseDrawer();
      window.dispatchEvent(new Event('navigate-to-summary'));
      setTimeout(() => {
        window.dispatchEvent(new Event('generate-all'));
      }, 300);
    }
  };

  const handleStartEdit = () => {
    setEditingSummary(true);
  };

  const handleSaveEdit = () => {
    if (selectedItem) {
      updateHistory(selectedItem.id, { summary: editSummaryContent });
      setSavedSummary(editSummaryContent);
      setSummary(editSummaryContent);
      setEditingSummary(false);
    }
  };

  const handleCancelEdit = () => {
    if (selectedItem) {
      setEditSummaryContent(savedSummary);
    }
    setEditingSummary(false);
  };

  const handleDownloadSingle = () => {
    if (!selectedItem) return;

    const content = `# 记录详情\n\n## 基本信息\n- 分类：${selectedItem.category}\n- 状态：${selectedItem.status}\n- 创建时间：${new Date(selectedItem.createdAt).toLocaleString('zh-CN')}\n\n## 原始内容\n\n${selectedItem.content}\n\n## 生成的标题\n\n### 客观纪实标题\n${selectedItem.titles.objective}\n\n### 数据亮点标题\n${selectedItem.titles.dataHighlight}\n\n### 轻量化标题\n${selectedItem.titles.lightweight}\n\n## 摘要内容\n\n${editingSummary ? editSummaryContent : savedSummary}\n\n## 质量指标\n${selectedItem.quality ? `\n- 覆盖率：${selectedItem.quality.coverageRate}%\n- 标题偏离度：${selectedItem.quality.titleDeviation}%\n- 幻觉次数：${selectedItem.quality.hallucinationCount}` : ''}`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `记录详情_${new Date(selectedItem.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map(item => item.id)));
    }
  };

  const handleBatchExport = async () => {
    const itemsToExport = selectedIds.size > 0 
      ? history.filter(item => selectedIds.has(item.id))
      : filteredHistory;

    if (itemsToExport.length === 0) {
      alert('没有可导出的记录');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('历史记录导出');

    itemsToExport.forEach(item => {
      const content = `# 记录详情\n\n## 基本信息\n- 分类：${item.category}\n- 状态：${item.status}\n- 创建时间：${new Date(item.createdAt).toLocaleString('zh-CN')}\n\n## 原始内容\n\n${item.content}\n\n## 生成的标题\n\n### 客观纪实标题\n${item.titles.objective}\n\n### 数据亮点标题\n${item.titles.dataHighlight}\n\n### 轻量化标题\n${item.titles.lightweight}\n\n## 摘要内容\n\n${item.summary}\n\n## 质量指标\n${item.quality ? `\n- 覆盖率：${item.quality.coverageRate}%\n- 标题偏离度：${item.quality.titleDeviation}%\n- 幻觉次数：${item.quality.hallucinationCount}` : ''}`;
      
      const fileName = `记录_${new Date(item.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}_${item.id.substring(0, 8)}.md`;
      folder?.file(fileName, content);
    });

    const blobContent = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blobContent);
    const link = document.createElement('a');
    link.href = url;
    link.download = `历史记录导出_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '国际': 'bg-red-100 text-red-700',
      '时政': 'bg-blue-100 text-blue-700',
      '科技': 'bg-cyan-100 text-cyan-700',
      '财经': 'bg-green-100 text-green-700',
      '体育': 'bg-orange-100 text-orange-700',
      '娱乐': 'bg-pink-100 text-pink-700',
      '健康': 'bg-emerald-100 text-emerald-700',
      '综合': 'bg-gray-100 text-gray-700',
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
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchExport}
              className="btn-secondary flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              导出选中 ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleBatchExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出全部
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
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
        
        <div className="relative">
          <button
            onClick={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowDateDropdown(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
              {HISTORY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="relative" ref={dateDropdownRef}>
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {dateFilter === 'custom' && customDate ? customDate : DATE_FILTERS.find(f => f.id === dateFilter)?.label}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
                {DATE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setDateFilter(filter.id);
                      if (filter.id !== 'custom') {
                        setCustomDate('');
                        setShowDateDropdown(false);
                      }
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      dateFilter === filter.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
                
                {dateFilter === 'custom' && (
                  <div className="px-4 py-2 border-t border-gray-100">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                      }}
                      className="input-field w-full text-sm"
                    />
                  </div>
                )}
              </div>
            )}
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
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {selectedIds.size === filteredHistory.length ? (
                  <CheckSquare className="w-4 h-4 text-primary-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                全选 ({filteredHistory.length})
              </button>
            </div>
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
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        selectedIds.has(item.id)
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-100 hover:border-primary-200'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              onClick={() => toggleSelect(item.id)}
                              className="mt-1 flex-shrink-0"
                            >
                              {selectedIds.has(item.id) ? (
                                <CheckSquare className="w-4 h-4 text-primary-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                              )}
                            </button>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSingle}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="下载记录"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
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
                      {savedSummary}
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