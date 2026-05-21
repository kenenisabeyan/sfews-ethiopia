with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.findall(r"setActiveTab\('([^']+)'\)", content)
print("Found setActiveTab calls:")
print(set(matches))

# Print the HTML where the sidebar navigation buttons are rendered
print("\nSidebar navigation items:")
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'activeTab ===' in line or 'setActiveTab' in line:
        if i > 0:
            print(f"Line {i}: {lines[i-1].strip()}")
        print(f"Line {i+1}: {line.strip()}")
        if i < len(lines) - 1:
            print(f"Line {i+2}: {lines[i+1].strip()}")
        print("-" * 20)
