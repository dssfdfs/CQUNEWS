const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "store", "useStore.ts");
let content = fs.readFileSync(filePath, "utf-8");

// 找到loadApiConfigsFromStorage函数的结束位置
const loadApiEnd = content.indexOf("};", content.indexOf("const loadApiConfigsFromStorage"));

// 在loadApiConfigsFromStorage之后添加loadHistory和saveHistory函数
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

content = content.slice(0, loadApiEnd + 2) + historyFuncs + content.slice(loadApiEnd + 2);

// 删除后面重复的函数定义
const firstDuplicate = content.indexOf("const loadHistoryFromStorage = (userId) => {", loadApiEnd + 200);
if (firstDuplicate > 0) {
  const endOfDuplicates = content.indexOf("};", firstDuplicate) + 2;
  content = content.slice(0, firstDuplicate) + content.slice(endOfDuplicates + 1);
}

fs.writeFileSync(filePath, content, "utf-8");
console.log("Fixed function order");
