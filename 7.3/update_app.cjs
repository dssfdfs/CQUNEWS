const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  'const { step, setStep, content, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs } = useStore();',
  'const { step, setStep, content, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs, customPrompt, summaryType, language } = useStore();'
);

content = content.replace(
  'const summary = await generateSummary(content, \'标准摘要\', \'中文\', apiConfig);',
  'const summary = await generateSummary(content, summaryType, language, apiConfig, customPrompt);'
);

content = content.replace(
  'const titles = await generateTitles(content, \'中文\', apiConfig);',
  'const titles = await generateTitles(content, language, apiConfig, customPrompt);'
);

content = content.replace(
  '}, [content, setStep, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs]);',
  '}, [content, setStep, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs, customPrompt, summaryType, language]);'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Updated App.tsx with custom prompt');
