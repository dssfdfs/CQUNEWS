const fs = require('fs');

let content = fs.readFileSync('src/components/ContentInput.tsx', 'utf-8');

content = content.replace(
  'const { content, setContent, summaryType, setSummaryType, model, setModel, language, setLanguage, inputType, setInputType, isGenerating } = useStore();',
  'const { content, setContent, summaryType, setSummaryType, model, setModel, language, setLanguage, inputType, setInputType, isGenerating, customPrompt, setCustomPrompt } = useStore();'
);

content = content.replace(
  '<button\n        onClick={handleGenerate}\n        disabled={!content.trim() || isGenerating}\n        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"\n      >',
  '<textarea\n        value={customPrompt}\n        onChange={(e) => setCustomPrompt(e.target.value)}\n        placeholder="输入个性化要求（可选），例如：摘要要更简洁、标题要更吸引人..."\n        className="input-field h-24 resize-none mb-6 text-gray-700 placeholder-gray-400"\n      />\n\n      <button\n        onClick={handleGenerate}\n        disabled={!content.trim() || isGenerating}\n        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"\n      >'
);

fs.writeFileSync('src/components/ContentInput.tsx', content, 'utf-8');
console.log('Updated ContentInput.tsx with custom prompt input');
