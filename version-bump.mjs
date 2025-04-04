import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// 读取manifest.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

// 更新manifest.json中的版本号
// 注意：package.json中的版本格式为"v1.0.2"，而manifest.json中的版本格式为"1.0.2"，需要去掉前缀"v"
const manifestVersion = targetVersion.startsWith("v") ? targetVersion.slice(1) : targetVersion;
manifest.version = manifestVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// 读取versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));

// 更新versions.json，添加新版本号与最低支持的Obsidian版本的映射
// 使用manifest.json中的minAppVersion作为最低支持的Obsidian版本
versions[targetVersion] = manifest.minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

console.log(`版本已更新至 ${targetVersion}`);