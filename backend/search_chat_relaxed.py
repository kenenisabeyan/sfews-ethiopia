with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Searching for '/api/v1/chat' or 'chat' or 'agent' or 'ai':")
for i, line in enumerate(lines):
    lower_line = line.lower()
    if 'chat' in lower_line or 'ask' in lower_line or 'agent' in lower_line or 'ai' in lower_line:
        if len(line.strip()) < 100:
            print(f"Line {i+1}: {line.strip()}")
