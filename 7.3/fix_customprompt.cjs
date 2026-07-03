const fs = require('fs');

let content = fs.readFileSync('src/api/deepseek.ts', 'utf-8');

content = content.replace(
  '3. 轻量化标题：轻松活泼，吸引读者注意力\n\n${language === \\'中文\\' ? \\'请使用中文\\' : \\'Please use English\\'},',
  '3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : \\'\\'} \n\n${language === \\'中文\\' ? \\'请使用中文\\' : \\'Please use English\\'},'
);

fs.writeFileSync('src/api/deepseek.ts', content, 'utf-8');
console.log('Fixed customPrompt usage in generateTitles');
