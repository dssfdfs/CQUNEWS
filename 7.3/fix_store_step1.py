with open("src/store/useStore.ts", "r", encoding="utf-8") as f:
    content = f.read()
old_load_api = \"\"\"const loadApiConfigsFromStorage = () => {\"\"\"
