import os
import json

resources_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "./resources"))
save_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "./resources.json"))

print(f"资源路径: {resources_path}")
print(f"保存路径: {save_path}")

if not os.path.exists(resources_path):
    print("文件夹不存在")
    exit(1)

files = os.listdir(resources_path)
print(f"文件列表: {files}")

json_data = {}
for file in files:
    lang = os.path.splitext(file)[0]
    print(f"处理文件: {file}, 语言: {lang}")
    with open(os.path.join(resources_path, file), 'r', encoding='utf-8') as f:
        content = json.load(f)
    
    if lang in json_data:
        print(f"更新现有语言数据: {lang}")
        json_data[lang].update(content)
    else:
        print(f"添加新语言数据: {lang}")
        json_data[lang] = content

with open(save_path, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=4)
    print(f"数据已保存到: {save_path}")
