with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

keywords = ['token', 'auth', 'login', 'password', 'user']
print("Searching for auth-related terms in App.tsx:")
lines = content.split('\n')
for idx, line in enumerate(lines):
    lower_line = line.lower()
    if any(kw in lower_line for kw in keywords):
        if len(line.strip()) < 100:
            print(f"Line {idx+1}: {line.strip()}")
