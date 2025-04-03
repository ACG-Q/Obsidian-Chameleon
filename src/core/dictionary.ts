/**
 * 字典管理模块
 * 负责字典的加载、更新和管理
 */

import { FileSystemAdapter, Notice } from "obsidian";
import { Dictionary, MultiLanguageDictionary } from "../interfaces";
import { DICTIONARY_URL } from "../constants";
import { ErrorHandler, ErrorLevel } from "../utils/error-handler";

/**
 * 加载字典
 * @param path 字典文件路径
 * @param language 语言代码
 * @param fs 文件系统适配器
 * @param translate 翻译函数
 * @returns 加载的字典对象
 */
export async function loadDictionary(
    path: string, 
    language: string, 
    fs: FileSystemAdapter,
    translate: (key: string, defaultValue: string, params?: Record<string, string>) => string
): Promise<Dictionary> {
    const getDictionary = (content: string, language: string): Dictionary => {
        const dictionaries = JSON.parse(content) as MultiLanguageDictionary;
        if (!dictionaries[language]) {
            new Notice(translate("no_corresponding_language", "No corresponding language in the dictionary file: {lang}", { lang: language }));
            return {};
        }
        new Notice(translate("dictionary_loaded", "Dictionary file loaded: {path}", { path }));
        return dictionaries[language];
    };

    const isExists = await fs.exists(path);
    if (!isExists) {
        // 通过相对于 Obsidian 标准目录的路径来查找文件，发现不存在，那么尝试读取方法
        try {
            const arrayBuffer = await FileSystemAdapter.readLocalFile(path);
            const decoder = new TextDecoder("utf-8");
            const content = decoder.decode(arrayBuffer);
            return getDictionary(content, language);
        } catch (error) {
            ErrorHandler.error(
                "字典文件读取失败",
                error as Error,
                { path, language }
            );
            new Notice(translate("dictionary_not_found", "Dictionary file not found: {path}", { path }));
            return {};
        }
    } else {
        const content = await fs.read(path);
        ErrorHandler.info(`字典文件已加载：${path}`, { language });
        return getDictionary(content, language);
    }
}

/**
 * 更新内置字典
 * 从GitHub仓库下载最新的字典文件
 * 
 * @param defaultDictionaryPath 默认字典路径
 * @param dictionaryPath 当前使用的字典路径
 * @param fs 文件系统适配器
 * @param translate 翻译函数
 * @param reloadTranslation 重新加载翻译的回调函数
 */
export async function updateBuiltInDictionary(
    defaultDictionaryPath: string,
    dictionaryPath: string,
    fs: FileSystemAdapter,
    translate: (key: string, defaultValue: string, params?: Record<string, string>) => string,
    reloadTranslation: (path: string) => Promise<void>
): Promise<void> {
    try {
        ErrorHandler.info("开始更新内置字典", { url: DICTIONARY_URL });
        const response = await fetch(DICTIONARY_URL);
        
        if (!response.ok) {
            ErrorHandler.error(
                "内置字典下载失败",
                `HTTP error! status: ${response.status}`,
                { url: DICTIONARY_URL, status: response.status }
            );
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 4);

        // 写入文件系统
        await fs.write(defaultDictionaryPath, jsonString);

        // 内置字典已更新
        ErrorHandler.info("内置字典更新成功", { path: defaultDictionaryPath });
        new Notice(translate("builtin_dictionary_updated", "Built-in dictionary updated"));

        // 刷新翻译
        await reloadTranslation(dictionaryPath);
    } catch (error) {
        // 内置字典更新失败
        ErrorHandler.error(
            "内置字典更新失败",
            error as Error,
            { url: DICTIONARY_URL, path: defaultDictionaryPath }
        );
        new Notice(translate("builtin_dictionary_update_failed", "Failed to update built-in dictionary") + ": " + (error as Error).message);
    }
}

/**
 * 导出未翻译文本
 * @param texts 未翻译的文本数组
 * @param language 语言代码
 * @param pluginDir 插件目录
 * @param fs 文件系统适配器
 */
export async function exportUntranslatedTexts(
    texts: string[], 
    language: string, 
    pluginDir: string, 
    fs: FileSystemAdapter
): Promise<void> {
    // 导出为翻译成 language 的文本
    const path = pluginDir + `/untranslated-to-${language}.txt`;
    const isExists = await fs.exists(path);
    let content: Record<string, string> = {};
    
    try {
        content = isExists ? JSON.parse(await fs.read(path)) : {};
    } catch (e) { /* 如果文件不存在或格式不正确，使用空对象 */ }

    for (const text of texts) {
        if (content.hasOwnProperty(text) || text.trim() === "") continue;
        content = { ...content, [text]: "" };
    }

    await fs.write(path, JSON.stringify(content, null, 2));
}