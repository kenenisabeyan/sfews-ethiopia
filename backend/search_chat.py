with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Searching for chat-related keywords:")
for i, line in enumerate(lines):
    if '/chat' in line or 'ask' in line or 'message' in line or 'Chat' in line:
        if any(keyword in line for keyword in ['axios', 'fetch', 'api', 'url', 'post', 'get', 'chat', 'ask']):
            print(f"Line {i+1}: {line.strip()}")
