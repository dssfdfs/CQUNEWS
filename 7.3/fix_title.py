with open("src/components/TitleOutput.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 将input改为textarea以支持多行显示
content = content.replace(
    """<div className="w-full bg-gray-50 rounded-lg p-3 min-h-[60px] max-h-[120px] overflow-y-auto">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    setTitles({ ...titles, [item.id]: e.target.value });
                  }}
                  className="w-full text-gray-700 border-none outline-none bg-transparent"
                  readOnly={false}
                />
              </div>""",
    """<div className="w-full bg-gray-50 rounded-lg p-3 min-h-[80px] max-h-[150px] overflow-y-auto">
                <textarea
                  value={item.value}
                  onChange={(e) => {
                    setTitles({ ...titles, [item.id]: e.target.value });
                  }}
                  className="w-full text-gray-700 border-none outline-none bg-transparent resize-none"
                  placeholder="标题内容"
                  rows={3}
                />
              </div>"""
)

with open("src/components/TitleOutput.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed TitleOutput component")
