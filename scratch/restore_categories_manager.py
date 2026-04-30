import subprocess

# 1. Get CategoriesManager from commit 1b07ac3
cmd = "git show 1b07ac3:src/RiskManagement.jsx"
output = subprocess.check_output(cmd, shell=True).decode('utf-8')

start_idx = output.find('function CategoriesManager')
end_idx = output.find('// --- Academic Years Manager', start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find CategoriesManager in commit 1b07ac3")
    exit(1)

categories_manager_code = output[start_idx:end_idx]

# 2. Insert into current RiskManagement.jsx
with open('src/RiskManagement.jsx', 'r') as f:
    content = f.read()

target_idx = content.find('// --- Academic Years Manager')

if target_idx == -1:
    print("Could not find // --- Academic Years Manager in current file")
    exit(1)

new_content = content[:target_idx] + categories_manager_code + "\n" + content[target_idx:]

with open('src/RiskManagement.jsx', 'w') as f:
    f.write(new_content)

print("CategoriesManager restored.")
