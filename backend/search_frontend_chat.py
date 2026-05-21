import os

src_dir = r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src'
print("Searching for agent/chat keywords in frontend:")
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    content = f.read()
                    if 'chat' in content.lower() or 'agent' in content.lower() or 'ask' in content.lower():
                        print(f"File: {os.path.relpath(filepath, src_dir)}")
                        # print lines containing the keyword
                        lines = content.split('\n')
                        for idx, line in enumerate(lines):
                            if any(k in line.lower() for k in ['chat', 'agent', 'ask']):
                                if len(line.strip()) < 100:
                                    print(f"  Line {idx+1}: {line.strip()}")
                except Exception as e:
                    pass
