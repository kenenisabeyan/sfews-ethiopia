with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r'const navItems\b.*?\s*=\s*\[(.*?)\];', content, re.DOTALL)
if match:
    print("Found navItems:")
    print(match.group(1).strip())
else:
    # Try finding let navItems or just navItems
    match2 = re.search(r'navItems\s*=\s*\[(.*?)\];', content, re.DOTALL)
    if match2:
        print("Found navItems:")
        print(match2.group(1).strip())
    else:
        print("navItems not found by regex")
        # Let's search line-by-line
        lines = content.split('\n')
        for i, l in enumerate(lines):
            if 'navItems' in l:
                print(f"Line {i+1}: {l}")
