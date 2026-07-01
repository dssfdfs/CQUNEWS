import { useState, useEffect } from 'react';
import { Clock, Download, Trash2, Eye, Search, Calendar, Filter, RefreshCw, Edit3, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Clock as ClockIcon, X, FileText, FileCheck, FileWarning } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function History() {
  const { history, removeHistory, setContent, setSummary, setTitles, setStep, setQuality, loadHistory } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部状态');
  const [selectedItem, setSelectedItem] = useState<typeof history[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const statusOptions = ['全部状态', '已完成', '处理中', '待处理'];

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter((item) => {
    const matchSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.titles.objective.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatus = statusFilter === '全部状态' || item.status === statusFilter;
    
    const createdAt = new Date(item.createdAt);
    const matchStart = !startDate || createdAt >= new Date(startDate);
    const matchEnd = !endDate || createdAt <= new Date(endDate + 'T23:59:59');
    
    return matchSearch && matchStatus && matchStart && matchEnd;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      removeHistory(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleView = (item: typeof history[0]) => {
    setSelectedItem(item);
  };

  const handleRegenerate = (item: typeof history[0]) => {
    setContent(item.content);
    setSummary('');
    setTitles({ objective: '', dataHighlight: '', lightweight: '' });
    setQuality({ coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 });
    setStep(1);
    window.dispatchEvent(new CustomEvent('generate-all'));
  };

  const handleEdit = (item: typeof history[0]) => {
    setContent(item.content);
    setSummary(item.summary);
    setTitles(item.titles);
    setQuality(item.quality);
    setStep(5);
  };

  const handleDownload = (item: typeof history[0]) => {
    const content = `标题：${item.titles.objective}\n\n摘要：${item.summary}\n\n原文：${item.content}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `新闻摘要_${new Date(item.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case '已完成':
        return { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
      case '处理中':
        return { label: '处理中', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ClockIcon };
      default:
        return { label: '待处理', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: AlertCircle };
    }
  };

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      '科技': { bg: 'bg-blue-100', text: 'text-blue-700' },
      '财经': { bg: 'bg-green-100', text: 'text-green-700' },
      '国际': { bg: 'bg-purple-100', text: 'text-purple-700' },
      '教育': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      '娱乐': { bg: 'bg-pink-100', text: 'text-pink-700' },
      '体育': { bg: 'bg-red-100', text: 'text-red-700' },
    };
    return styles[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">个人历史</h1>
          <p className="text-gray-500 mt-1">查看和管理您的处理记录</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {filteredHistory.length} 条记录</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">时间范围：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="input-field text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="input-field text-sm"
            />
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="请输入关键词"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input-field pl-10 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">处理状态：</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="input-field text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={`flex-1 ${selectedItem ? 'flex-[2]' : ''}`}>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">序号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">标题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">摘要</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分类</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">处理时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无历史记录</p>
                        <p className="text-sm mt-1">开始处理新闻后，记录会保存在这里</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((item, index) => {
                      const status = getStatusInfo(item.status);
                      const StatusIcon = status.icon;
                      const categoryStyle = getCategoryStyle(item.category);
                      
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedItem?.id === item.id ? 'bg-primary-50' : ''}`}
                          onClick={() => handleView(item)}
                        >
                          <td className="px-4 py-4 text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-800 truncate max-w-xs" title={item.titles.objective || item.content.substring(0, 50)}>
                              {item.titles.objective || item.content.substring(0, 50)}...
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-600 truncate max-w-xs" title={item.summary}>
                              {item.summary.substring(0, 50)}...
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleView(item)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="查看"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="编辑"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRegenerate(item)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="重新生成"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(item)}
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                title="下载"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {filteredHistory.length} 条记录，显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredHistory.length)} 条
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${currentPage === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <select
                    value={itemsPerPage}
                    className="input-field text-sm ml-2"
                  >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="w-96 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                记录详情
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">处理时间</span>
                  <p className="text-sm text-gray-700 mt-0.5">{formatDateTime(selectedItem.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">状态：</span>
                  {(() => {
                    const status = getStatusInfo(selectedItem.status);
                    const StatusIcon = status.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  摘要与标题
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex-shrink-0">客观纪实</span>
                    <span className="text-sm text-gray-700">{selectedItem.titles.objective}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex-shrink-0">数据亮点</span>
                    <span className="text-sm text-gray-700">{selectedItem.titles.dataHighlight}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex-shrink-0">轻量化</span>
                    <span className="text-sm text-gray-700">{selectedItem.titles.lightweight}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">摘要详情</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {selectedItem.summary}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  原文
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {selectedItem.content.substring(0, 500)}{selectedItem.content.length > 500 ? '...' : ''}
                </p>
              </div>
              
              {selectedItem.quality && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <FileWarning className="w-4 h-4" />
                    质量校验
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-green-600">{selectedItem.quality.coverageRate || 0}%</div>
                      <div className="text-xs text-gray-500">覆盖率</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-yellow-600">{selectedItem.quality.titleDeviation || 0}%</div>
                      <div className="text-xs text-gray-500">偏离度</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-red-600">{selectedItem.quality.hallucinationCount || 0}</div>
                      <div className="text-xs text-gray-500">幻觉数</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 px-4 py-3 flex gap-2">
              <button
                onClick={() => handleRegenerate(selectedItem)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                重新处理
              </button>
              <button
                onClick={() => handleEdit(selectedItem)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <Edit3 className="w-4 h-4" />
                二次编辑
              </button>
              <button
                onClick={() => handleDownload(selectedItem)}
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
              <button
                onClick={() => handleDelete(selectedItem.id)}
                className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}