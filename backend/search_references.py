with open(r'c:\Users\kenenisa\Documents\sfews-ethiopia\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Searching for 'Awash Alpha Sensor':")
for i, line in enumerate(lines):
    if 'Awash Alpha Sensor' in line:
        print(f"Line {i+1}: {line.strip()}")

print("\nSearching for 'Awash Delta unit':")
for i, line in enumerate(lines):
    if 'Awash Delta unit' in line:
        print(f"Line {i+1}: {line.strip()}")
