const fs = require("fs");
let content = fs.readFileSync("src/api/deepseek.ts", "utf-8").replace(/3\. 轻量化标题：轻松活泼，吸引读者注意力\\n\\n/, "3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : ""} \n\n"); fs.writeFileSync("src/api/deepseek.ts", content, "utf-8"); console.log("Fixed");
