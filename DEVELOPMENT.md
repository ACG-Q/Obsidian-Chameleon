# Obsidian-Chameleon 开发文档

## 1. 项目概述

Obsidian-Chameleon 是一个为 Obsidian 提供多语言翻译支持的插件，能够自动识别和翻译界面文本，提升非英语用户的使用体验。插件支持多种语言，包括英语、简体中文、繁体中文等。

### 1.1 主要功能

- **自动文本翻译**：自动翻译界面文本和内容，支持自定义字典加载
- **可自定义翻译标识**：为翻译后的内容添加标识符（如 `[👌]`），支持自由编辑
- **未翻译文本记录**：自动记录未翻译的字符串，并支持导出文件，方便后续更新
- **支持自定义字典文件**：可加载自定义 JSON 格式字典文件，实现灵活翻译
- **实时翻译更新**：界面内容更新时立即应用翻译，无需手动刷新
- **状态栏显示**：在 Obsidian 状态栏实时显示未翻译字符串的数量

## 2. 项目结构

```
src/
├── components/              # 组件目录
│   └── settings/           # 设置相关组件
├── core/                    # 核心功能
│   ├── dictionary.ts       # 字典管理
│   ├── translator.ts       # 翻译核心
│   ├── text-processor.ts   # 文本处理
│   └── optimized-text-processor.ts # 优化的文本处理
├── interfaces/             # 接口定义
│   └── index.ts            # 类型和接口定义
├── locales/                # 本地化资源
│   ├── build.py            # 构建脚本
│   └── i18n.json           # 合并后的翻译文件
├── services/               # 服务层
│   ├── dictionary-service.ts # 字典管理服务
│   ├── translation-service.ts # 翻译服务
│   └── settings-service.ts  # 设置服务
├── utils/                   # 工具类
│   ├── enhanced-i18n.ts     # 增强的国际化工具
│   ├── error-handler.ts     # 错误处理工具
│   └── i18n.ts              # 基础国际化工具
├── constants.ts             # 常量定义
└── main.ts                  # 主入口（精简版）
```

## 3. 核心模块说明

### 3.1 核心层 (Core)

核心层提供基础功能，与UI和业务逻辑分离。

#### 3.1.1 字典管理 (dictionary.ts)

负责字典的加载、更新和管理：
- 加载本地或自定义字典文件
- 提供字典查询功能
- 支持导出未翻译文本

#### 3.1.2 翻译核心 (translator.ts)

提供核心翻译功能：
- 文本翻译和替换
- 语言检测和处理
- 管理未翻译文本列表

#### 3.1.3 文本处理 (text-processor.ts)

处理DOM文本替换：
- 遍历DOM元素并替换文本
- 处理特殊元素和属性
- 应用翻译标记

### 3.2 服务层 (Services)

服务层连接核心层和UI层，提供高级功能。

#### 3.2.1 翻译服务 (translation-service.ts)

整合翻译功能：
- 初始化翻译环境
- 提供翻译函数
- 管理字典更新和导出

#### 3.2.2 字典服务 (dictionary-service.ts)

提供字典管理功能：
- 在线字典更新
- 字典合并和冲突解决
- 自定义字典导入

#### 3.2.3 设置服务 (settings-service.ts)

管理插件设置：
- 加载和保存设置
- 提供设置访问接口

### 3.3 工具类 (Utils)

#### 3.3.1 增强的国际化工具 (enhanced-i18n.ts)

提供高级国际化功能：
- 支持复数形式处理
- 支持日期格式化
- 支持参数替换

#### 3.3.2 错误处理工具 (error-handler.ts)

统一的错误处理机制：
- 不同级别的日志记录
- 调试模式支持
- 错误上下文管理

## 4. 关键接口

### 4.1 插件设置接口 (IPluginSettings)

```typescript
export interface IPluginSettings {
    translationMark: {
        show: boolean;
        mark: string;
    };
    customDictionaryFile: string;
    recordUntranslated: boolean;
    isDebug: boolean;
}
```

### 4.2 翻译函数类型 (TranslateFunction)

```typescript
export type TranslateFunction = (
    key: string,
    defaultValue: string,
    params?: Record<string, string>,
    lang?: string
) => string
```

### 4.3 字典类型 (Dictionary)

```typescript
export type Dictionary = Record<string, string>;
export type MultiLanguageDictionary = Record<string, Dictionary>;
```

## 5. 开发流程

### 5.1 环境设置

1. 克隆仓库：
   ```bash
   git clone https://github.com/ACG-Q/Obsidian-Chameleon.git
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建项目：
   ```bash
   npm run build
   ```

4. 开发模式：
   ```bash
   npm run dev
   ```

### 5.2 翻译资源构建

构建合并的翻译文件：
```bash
npm run build:i18n
```

### 5.3 代码规范

运行代码检查：
```bash
npm run lint
```

## 6. 扩展开发

### 6.1 添加新语言支持

1. 在 `src/resources/locales/` 目录下创建新的语言文件（如 `fr.json`）
2. 运行 `npm run build:i18n` 合并翻译资源
3. 更新 `translator.ts` 中的语言检测逻辑（如需要）

### 6.2 增强字典功能

1. 在 `dictionary-service.ts` 中添加新的字典管理方法
2. 更新 `translation-service.ts` 以集成新功能
3. 如需要，在设置面板中添加相关配置选项

### 6.3 优化文本处理

1. 在 `optimized-text-processor.ts` 中实现优化的文本处理算法
2. 在 `translator.ts` 中集成优化的处理方法

## 7. 测试

### 7.1 手动测试

1. 构建插件并安装到 Obsidian 测试库中
2. 验证翻译功能在不同语言环境下的表现
3. 测试字典更新和导入功能

### 7.2 自动化测试

项目使用 GitHub Actions 进行自动化测试和构建：
- 代码质量检查
- 构建验证
- 发布流程

## 8. 贡献指南

### 8.1 提交规范

- 使用清晰的提交信息
- 遵循项目的代码风格
- 提交前运行代码检查

### 8.2 问题报告

在 GitHub Issues 中报告问题时，请提供：
- Obsidian 版本
- 插件版本
- 问题详细描述
- 复现步骤

### 8.3 功能请求

提出新功能建议时，请说明：
- 功能描述
- 使用场景
- 预期行为

## 9. 发布流程

1. 更新版本号：
   ```bash
   npm run version
   ```

2. 构建生产版本：
   ```bash
   npm run build
   ```

3. 提交更改并创建标签

4. GitHub Actions 将自动构建并发布新版本

## 10. 常见问题解答

### 10.1 字典更新频率

字典更新有24小时的冷却时间，可以通过 `forceUpdate` 参数强制更新。

### 10.2 自定义字典格式

自定义字典必须是有效的 JSON 格式，结构为：
```json
{
  "语言代码": {
    "原文": "翻译"
  }
}
```

### 10.3 调试模式

启用调试模式可以在控制台查看详细日志，有助于排查问题。