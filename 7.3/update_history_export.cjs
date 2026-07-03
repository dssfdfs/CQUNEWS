const fs = require('fs');

let content = fs.readFileSync('src/components/History.tsx', 'utf-8');

const oldExport = `const handleBatchExport = async () => {
    const itemsToExport = selectedIds.size > 0 
      ? history.filter(item => selectedIds.has(item.id))
      : filteredHistory;

    if (itemsToExport.length === 0) {
      alert('没有可导出的记录');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('历史记录导出');

    itemsToExport.forEach(item => {
      const content = `# 记录详情\n\n## 基本信息\n- 分类：${item.category}\n- 状态：${item.status}\n- 创建时间：${new Date(item.createdAt).toLocaleString('zh-CN')}\n\n## 原始内容\n\n${item.content}\n\n## 生成的标题\n\n### 客观纪实标题\n${item.titles.objective}\n\n### 数据亮点标题\n${item.titles.dataHighlight}\n\n### 轻量化标题\n${item.titles.lightweight}\n\n## 摘要内容\n\n${item.summary}\n\n## 质量指标\n${item.quality ? `\n- 覆盖率：${item.quality.coverageRate}%\n- 标题偏离度：${item.quality.titleDeviation}%\n- 幻觉次数：${item.quality.hallucinationCount}` : ''}`;
      
      const fileName = `记录_${new Date(item.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}_${item.id.substring(0, 8)}.md`;
      folder?.file(fileName, content);
    });

    const blobContent = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blobContent);
    const link = document.createElement('a');
    link.href = url;
    link.download = `历史记录导出_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };`;

const newExport = `const handleBatchExport = async () => {
    const itemsToExport = selectedIds.size > 0 
      ? filteredHistory.filter(item => selectedIds.has(item.id))
      : history;

    if (itemsToExport.length === 0) {
      alert('没有可导出的记录');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('历史记录导出');

    itemsToExport.forEach(item => {
      const recordContent = \\`# 记录详情\\n\\n## 基本信息\\n- 分类：\\${item.category}\\n- 状态：\\${item.status}\\n- 创建时间：\\${new Date(item.createdAt).toLocaleString('zh-CN')}\\n\\n## 原始内容\\n\\n\\${item.content}\\n\\n## 生成的标题\\n\\n### 客观纪实标题\\n\\${item.titles.objective}\\n\\n### 数据亮点标题\\n\\${item.titles.dataHighlight}\\n\\n### 轻量化标题\\n\\${item.titles.lightweight}\\n\\n## 摘要内容\\n\\n\\${item.summary}\\n\\n## 质量指标\\${item.quality ? \\`\\n- 覆盖率：\\${item.quality.coverageRate}%\\n- 标题偏离度：\\${item.quality.titleDeviation}%\\n- 幻觉次数：\\${item.quality.hallucinationCount}\\` : ''}\\`;
      
      const fileName = \\`记录_\\${new Date(item.createdAt).toLocaleDateString('zh-CN').replace(/\\//g, '-')}_\\${String(item.id).substring(0, 8)}.md\\`;
      folder?.file(fileName, recordContent);
    });

    const blobContent = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blobContent);
    const link = document.createElement('a');
    link.href = url;
    link.download = \\`历史记录导出_\\${new Date().toLocaleDateString('zh-CN').replace(/\\//g, '-')}.zip\\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };`;

content = content.replace(oldExport, newExport);

fs.writeFileSync('src/components/History.tsx', content, 'utf-8');
console.log('Updated History.tsx export function');
