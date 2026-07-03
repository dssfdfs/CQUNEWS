with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. 修复登录后加载历史记录
content = content.replace(
    """if (user) {
      set({ isAuthenticated: true, currentUser: user });
      localStorage.setItem("user", JSON.stringify(user));
      return true;
    }""",
    """if (user) {
      const userHistory = loadHistoryFromStorage(user.id);
      set({ isAuthenticated: true, currentUser: user, history: userHistory });
      localStorage.setItem("user", JSON.stringify(user));
      return true;
    }"""
)

# 2. 修复注册后加载历史记录（新用户为空）
content = content.replace(
    """mockUsers.push(newUser);
    set({ isAuthenticated: true, currentUser: newUser });
    localStorage.setItem("user", JSON.stringify(newUser));
    return true;""",
    """mockUsers.push(newUser);
    set({ isAuthenticated: true, currentUser: newUser, history: [] });
    localStorage.setItem("user", JSON.stringify(newUser));
    return true;"""
)

# 3. 添加removeMultipleHistory方法
content = content.replace(
    "removeHistory: (id) => {",
    """removeMultipleHistory: (ids) => {
    set((state) => {
      const newHistory = state.history.filter((item) => !ids.includes(item.id));
      saveHistoryToStorage(state.currentUser?.id || null, newHistory);
      return { history: newHistory };
    });
  },
  removeHistory: (id) => {"""
)

# 4. 修复addHistory ID生成
content = content.replace(
    "id: Date.now().toString(),",
    "id: Date.now().toString() + Math.random().toString(36).slice(2, 9),"
)

# 5. 修复批量导出逻辑：选中用filteredHistory，导出全部用history
content = content.replace(
    """const itemsToExport = selectedIds.size > 0 
      ? history.filter(item => selectedIds.has(item.id))
      : history;""",
    """const itemsToExport = selectedIds.size > 0 
      ? filteredHistory.filter(item => selectedIds.has(item.id))
      : history;"""
)

# 6. 更新批量删除使用removeMultipleHistory
content = content.replace(
    """const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      alert("请先选择要删除的记录");
      return;
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) {
      selectedIds.forEach(id => removeHistory(id));
      setSelectedIds(new Set());
    }
  };""",
    """const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      alert("请先选择要删除的记录");
      return;
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) {
      removeMultipleHistory([...selectedIds]);
      setSelectedIds(new Set());
    }
  };"""
)

with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed all issues")
