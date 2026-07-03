with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "removeHistory: (id: string) => void;",
    "removeMultipleHistory: (ids: string[]) => void;\n  removeHistory: (id: string) => void;"
)

with open("src/store/useStore.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed NewsState interface")
