import { useState } from 'react';
import { Clock, Download, Trash2, Eye, Search, Calendar, Filter } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function History() {
  const { history } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      const store = useStore.getState();
      store.history = store.history.filter((item) => item.id !== id);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
                      <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
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
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {expandedId === item.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">摘要内容</h4>
                              <p className="text-gray-700 text-sm">{item.summary}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">生成标题</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">客观中立</span>
                                  <span className="text-gray-700 text-sm">{item.titles.objective}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">数据亮眼</span>
                                  <span className="text-gray-700 text-sm">{item.titles.dataHighlight}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">轻松活泼</span>
                                  <span className="text-gray-700 text-sm">{item.titles.lightweight}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}