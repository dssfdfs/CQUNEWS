const fs = require('fs');

let content = fs.readFileSync('src/components/History.tsx', 'utf-8');

content = content.replace(
  'const itemsToExport = selectedIds.size > 0 \n      ? history.filter(item => selectedIds.has(item.id))\n      : filteredHistory;',
  'const itemsToExport = selectedIds.size > 0 \n      ? filteredHistory.filter(item => selectedIds.has(item.id))\n      : history;'
);

fs.writeFileSync('src/components/History.tsx', content, 'utf-8');
console.log('Fixed History.tsx export logic');
