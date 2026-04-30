with open('src/RiskManagement.jsx', 'r') as f:
    lines = f.readlines()

# Remove lines 1247-1628 (0-indexed: 1246-1627)
new_lines = lines[:1246] + lines[1628:]

with open('src/RiskManagement.jsx', 'w') as f:
    f.writelines(new_lines)
print("Removed old duplicate RiskReportsView")
