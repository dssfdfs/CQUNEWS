const fs = require('fs');

let content = fs.readFileSync('src/api/deepseek.ts', 'utf-8');

content = content.replace(
  'export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig): Promise<string> {',
  'export async function generateSummary(content: string, summaryType: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<string> {'
);

content = content.replace(
  '4. ${language === \'中文\' ? \'使用中文\' : \'Use English\'}`;',
  '4. ${language === \'中文\' ? \'使用中文\' : \'Use English\'}\n${customPrompt ? `\n额外要求：${customPrompt}` : \'\'} `;'
);

content = content.replace(
  'export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig): Promise<{',
  'export async function generateTitles(content: string, language: string, apiConfig?: ApiConfig, customPrompt?: string): Promise<{'
);

content = content.replace(
  '3. 轻量化标题：轻松活泼，吸引读者注意力\n\n${language === \'中文\' ? \'请使用中文\' : \'Please use English\'},',
  '3. 轻量化标题：轻松活泼，吸引读者注意力\n${customPrompt ? `\n额外要求：${customPrompt}` : \'\'} \n\n${language === \'中文\' ? \'请使用中文\' : \'Please use English\'},'
);

fs.writeFileSync('src/api/deepseek.ts', content, 'utf-8');
console.log('Updated deepseek.ts with custom prompt support');
