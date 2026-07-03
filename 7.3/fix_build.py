import re

# Fix History.tsx
with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\components\History.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('FolderZip', 'Folder')

with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\components\History.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed History.tsx')

# Fix SummaryOutput.tsx
with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\components\SummaryOutput.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { generateSummary } from "@/api/deepseek";', '')

content = content.replace(
    'const { summary, setSummary, content, summaryType, language, setIsGenerating } = useStore();',
    'const { summary, setSummary, content, setIsGenerating } = useStore();'
)

with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\components\SummaryOutput.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed SummaryOutput.tsx')

# Fix useStore.ts
with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\store\useStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const contentLower = content.toLowerCase();', '')

with open(r'D:\我狗屁不通的编程成果\实训2\cqunews-7.1\src\store\useStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed useStore.ts')

print('All fixes completed!')