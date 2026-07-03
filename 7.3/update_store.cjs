const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

content = content.replace(
  'language: string;\n  inputType: string;\n  isGenerating: boolean;',
  'language: string;\n  inputType: string;\n  isGenerating: boolean;\n  customPrompt: string;'
);

content = content.replace(
  'setInputType: (inputType: string) => void;\n  setIsGenerating: (isGenerating: boolean) => void;',
  'setInputType: (inputType: string) => void;\n  setIsGenerating: (isGenerating: boolean) => void;\n  setCustomPrompt: (customPrompt: string) => void;'
);

content = content.replace(
  'inputType: \'text\',\n  isGenerating: false,',
  'inputType: \'text\',\n  isGenerating: false,\n  customPrompt: \'\','
);

content = content.replace(
  'setInputType: (inputType) => set({ inputType }),\n  setIsGenerating: (isGenerating) => set({ isGenerating }),',
  'setInputType: (inputType) => set({ inputType }),\n  setIsGenerating: (isGenerating) => set({ isGenerating }),\n  setCustomPrompt: (customPrompt) => set({ customPrompt }),'
);

fs.writeFileSync('src/store/useStore.ts', content, 'utf-8');
console.log('Updated useStore.ts with customPrompt');
