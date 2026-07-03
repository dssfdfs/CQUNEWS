with open("src/components/History.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const itemsToExport = selectedIds.size > 0 \n      ? history.filter(item => selectedIds.has(item.id))\n      : filteredHistory;",
    "const itemsToExport = selectedIds.size > 0 \n      ? filteredHistory.filter(item => selectedIds.has(item.id))\n      : history;"
)

with open("src/components/History.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed batch export")
