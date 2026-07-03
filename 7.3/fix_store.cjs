const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "store", "useStore.ts");
let content = fs.readFileSync(filePath, "utf-8");

// 添加loadHistory和saveHistory函数
const historyFuncs = `

const loadHistoryFromStorage = (userId) => {
  if (!userId) return [];
  try {
    const historyStr = localStorage.getItem(\`history_\${userId}\`);
    if (historyStr) {
      const history = JSON.parse(historyStr);
      return history.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    }
  } catch (e) {
    console.error("Failed to load history from storage:", e);
  }
  return [];
};

const saveHistoryToStorage = (userId, history) => {
  if (!userId) return;
  try {
    localStorage.setItem(\`history_\${userId}\`, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history to storage:", e);
  }
};`;

content = content.replace(
  "const initialApiConfigs = loadApiConfigsFromStorage();",
  "const initialApiConfigs = loadApiConfigsFromStorage();" + historyFuncs
);

// 添加initialHistory初始化
content = content.replace(
  "const initialApiConfigs = loadApiConfigsFromStorage();",
  "const initialApiConfigs = loadApiConfigsFromStorage();\nconst initialHistory = loadHistoryFromStorage(initialUser?.id || null);"
);

// 更新history初始值
content = content.replace(
  "history: [],",
  "history: initialHistory,"
);

// 更新addHistory
content = content.replace(
  "set((state) => ({",
  "set((state) => {\n      const newHistory = [newItem, ...state.history];\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return {"
);

// 更新updateHistory
content = content.replace(
  "updateHistory: (id, updates) => {\n    set((state) => ({",
  "updateHistory: (id, updates) => {\n    set((state) => {\n      const newHistory = state.history.map((item) => \n        item.id === id ? { ...item, ...updates, createdAt: new Date() } : item\n      );\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return {"
);

// 更新removeHistory
content = content.replace(
  "removeHistory: (id) => {\n    set((state) => ({",
  "removeHistory: (id) => {\n    set((state) => {\n      const newHistory = state.history.filter((item) => item.id !== id);\n      saveHistoryToStorage(state.currentUser?.id || null, newHistory);\n      return {"
);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Fixed history persistence");
