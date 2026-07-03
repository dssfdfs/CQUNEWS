const fs = require('fs');

let content = fs.readFileSync('src/components/SummaryOutput.tsx', 'utf-8');
content = content.replace(/^import \{ generateSummary \} from "@\/api\/deepseek";\r?\n/m, '');
fs.writeFileSync('src/components/SummaryOutput.tsx', content, 'utf-8');
console.log('Fixed SummaryOutput.tsx');

console.log('All fixes completed!');
