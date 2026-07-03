const fs = require('fs');

let content = fs.readFileSync('src/components/SummaryOutput.tsx', 'utf-8');
content = content.replace('import { generateSummary } from "@/api/deepseek";', '');
content = content.replace('const { summary, setSummary, content, summaryType, language, setIsGenerating } = useStore();', 'const { summary, setSummary, content, setIsGenerating } = useStore();');
fs.writeFileSync('src/components/SummaryOutput.tsx', content, 'utf-8');
console.log('Fixed SummaryOutput.tsx');

content = fs.readFileSync('src/store/useStore.ts', 'utf-8');
content = content.replace('const contentLower = content.toLowerCase();', '');
fs.writeFileSync('src/store/useStore.ts', content, 'utf-8');
console.log('Fixed useStore.ts');

console.log('All fixes completed!');
