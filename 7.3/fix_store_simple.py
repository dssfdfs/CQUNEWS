with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("};\n\nconst { isAuthenticated", "};\n\nconst loadHistoryFromStorage = (userId) => {\n  if (!userId) return [];\n  try {\n    const historyStr = localStorage.getItem(`history_${userId}`);\n    if (historyStr) {\n      const history = JSON.parse(historyStr);\n      return history.map((item) => ({\n        ...item,\n        createdAt: new Date(item.createdAt),\n      }));\n    }\n  } catch (e) {\n    console.error(\"Failed to load history from storage:\", e);\n  }\n  return [];\n};\n\nconst saveHistoryToStorage = (userId, history) => {\n  if (!userId) return;\n  try {\n    localStorage.setItem(`history_${userId}`, JSON.stringify(history));\n  } catch (e) {\n    console.error(\"Failed to save history to storage:\", e);\n  }\n};\n\nconst { isAuthenticated")

content = content.replace("const initialApiConfigs = loadApiConfigsFromStorage();", "const initialApiConfigs = loadApiConfigsFromStorage();\nconst initialHistory = loadHistoryFromStorage(initialUser?.id || null);")

content = content.replace("history: [],", "history: initialHistory,")

content = content.replace("set((state) => ({\n      history: [newItem, ...state.history],\n    }));", "set((state) => {\n      const newHistory = [newItem, ...state.history];\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return { history: newHistory };\n    });")

content = content.replace("updateHistory: (id, updates) => {\n    set((state) => ({\n      history: state.history.map((item) => \n        item.id === id ? { ...item, ...updates, createdAt: new Date() } : item\n      ),\n    }));\n  },", "updateHistory: (id, updates) => {\n    set((state) => {\n      const newHistory = state.history.map((item) => \n        item.id === id ? { ...item, ...updates, createdAt: new Date() } : item\n      );\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return { history: newHistory };\n    });\n  },")

content = content.replace("removeHistory: (id) => {\n    set((state) => ({\n      history: state.history.filter((item) => item.id !== id),\n    }));\n  },", "removeHistory: (id) => {\n    set((state) => {\n      const newHistory = state.history.filter((item) => item.id !== id);\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return { history: newHistory };\n    });\n  },")

with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed history persistence")
