with open("src/components/History.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 修复批量导出逻辑
content = content.replace(
    """const handleBatchExport = async () => {
    const itemsToExport = selectedIds.size > 0 
      ? filteredHistory.filter(item => selectedIds.has(item.id))
      : history;""",
    """const handleBatchExport = async () => {
    const itemsToExport = selectedIds.size > 0 
      ? history.filter(item => selectedIds.has(item.id))
      : history;"""
)

# 添加批量删除功能
content = content.replace(
    """const handleBatchExport = async () => {""",
    """const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      alert("请先选择要删除的记录");
      return;
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) {
      selectedIds.forEach(id => removeHistory(id));
      setSelectedIds(new Set());
    }
  };

  const handleBatchExport = async () => {"""
)

# 在导出按钮区域添加批量删除按钮
content = content.replace(
    """{selectedIds.size > 0 && (
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
          </button>""",
    """{selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBatchDelete}
                className="btn-secondary flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedIds.size})
              </button>
              <button
                onClick={handleBatchExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                导出选中 ({selectedIds.size})
              </button>
            </>
          )}
          <button
            onClick={handleBatchExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出全部
          </button>"""
)

with open("src/components/History.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed batch export and added batch delete")
