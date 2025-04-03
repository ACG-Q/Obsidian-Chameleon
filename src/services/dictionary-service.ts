/**
 * 字典管理服务
 * 负责字典的在线更新、合并和冲突解决
 */

import { FileSystemAdapter, Notice } from "obsidian";
import { Dictionary, MultiLanguageDictionary } from "../interfaces";
import { DICTIONARY_URL } from "../constants";
import { ErrorHandler } from "../utils/error-handler";
import { loadDictionary, exportUntranslatedTexts } from "../core/dictionary";

/**
 * 字典管理服务类
 * 提供字典的在线更新、合并和冲突解决功能
 */
export class DictionaryService {
    private dictionaries: MultiLanguageDictionary = {};
    private lastUpdateTime: number = 0;
    
    /**
     * 构造函数
     * @param language 当前语言
     * @param translate 翻译函数
     */
    constructor(
        private language: string,
        private translate: (key: string, defaultValue: string, params?: Record<string, string>) => string
    ) {}
    
    /**
     * 初始化字典服务
     * @param dictionaryPath 字典路径
     * @param fs 文件系统适配器
     */
    async initialize(dictionaryPath: string, fs: FileSystemAdapter): Promise<Dictionary> {
        try {
            // 加载字典
            const dictionary = await loadDictionary(
                dictionaryPath,
                this.language,
                fs,
                this.translate
            );
            
            // 存储字典
            this.dictionaries[this.language] = dictionary;
            
            return dictionary;
        } catch (error) {
            ErrorHandler.error(
                "字典服务初始化失败",
                error as Error,
                { path: dictionaryPath, language: this.language }
            );
            return {};
        }
    }
    
    /**
     * 更新在线字典
     * @param defaultDictionaryPath 默认字典路径
     * @param dictionaryPath 当前使用的字典路径
     * @param fs 文件系统适配器
     * @param reloadTranslation 重新加载翻译的回调函数
     * @param forceUpdate 是否强制更新，忽略更新间隔限制
     */
    async updateOnlineDictionary(
        defaultDictionaryPath: string,
        dictionaryPath: string,
        fs: FileSystemAdapter,
        reloadTranslation: (path: string) => Promise<void>,
        forceUpdate: boolean = false
    ): Promise<void> {
        // 检查更新间隔（默认24小时内不重复更新，除非强制更新）
        const now = Date.now();
        const updateInterval = 24 * 60 * 60 * 1000; // 24小时
        
        if (!forceUpdate && (now - this.lastUpdateTime < updateInterval)) {
            const timeLeft = Math.ceil((updateInterval - (now - this.lastUpdateTime)) / (60 * 60 * 1000));
            new Notice(this.translate(
                "dictionary_update_interval", 
                "Dictionary was updated recently. Next update available in {hours} hours.", 
                { hours: timeLeft.toString() }
            ));
            return;
        }
        
        try {
            ErrorHandler.info("开始更新在线字典", { url: DICTIONARY_URL });
            new Notice(this.translate("updating_dictionary", "Updating dictionary..."));
            
            // 获取在线字典
            const response = await fetch(DICTIONARY_URL);
            
            if (!response.ok) {
                ErrorHandler.error(
                    "在线字典下载失败",
                    `HTTP error! status: ${response.status}`,
                    { url: DICTIONARY_URL, status: response.status }
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const onlineData = await response.json() as MultiLanguageDictionary;
            
            // 读取本地字典
            let localData: MultiLanguageDictionary = {};
            try {
                if (await fs.exists(defaultDictionaryPath)) {
                    const content = await fs.read(defaultDictionaryPath);
                    localData = JSON.parse(content);
                }
            } catch (error) {
                ErrorHandler.warning(
                    "读取本地字典失败，将使用在线字典覆盖",
                    error as Error,
                    { path: defaultDictionaryPath }
                );
            }
            
            // 合并字典
            const mergedData = this.mergeDictionaries(localData, onlineData);
            
            // 写入文件系统
            const jsonString = JSON.stringify(mergedData, null, 4);
            await fs.write(defaultDictionaryPath, jsonString);
            
            // 更新时间戳
            this.lastUpdateTime = now;
            
            // 字典已更新
            ErrorHandler.info("在线字典更新成功", { path: defaultDictionaryPath });
            new Notice(this.translate("dictionary_updated", "Dictionary updated successfully"));
            
            // 刷新翻译
            await reloadTranslation(dictionaryPath);
        } catch (error) {
            // 字典更新失败
            ErrorHandler.error(
                "在线字典更新失败",
                error as Error,
                { url: DICTIONARY_URL, path: defaultDictionaryPath }
            );
            new Notice(this.translate("dictionary_update_failed", "Failed to update dictionary") + ": " + (error as Error).message);
        }
    }
    
    /**
     * 合并字典
     * 将在线字典与本地字典合并，处理冲突
     * @param localDict 本地字典
     * @param onlineDict 在线字典
     * @returns 合并后的字典
     */
    private mergeDictionaries(localDict: MultiLanguageDictionary, onlineDict: MultiLanguageDictionary): MultiLanguageDictionary {
        const result: MultiLanguageDictionary = { ...localDict };
        
        // 遍历在线字典的所有语言
        for (const lang in onlineDict) {
            if (!result[lang]) {
                // 如果本地字典没有这个语言，直接添加
                result[lang] = { ...onlineDict[lang] };
            } else {
                // 如果本地字典有这个语言，合并条目
                for (const key in onlineDict[lang]) {
                    // 如果是新条目或空条目，使用在线版本
                    if (!result[lang][key] || result[lang][key] === "") {
                        result[lang][key] = onlineDict[lang][key];
                    }
                    // 对于已有的非空条目，保留本地版本（用户可能已经自定义）
                }
            }
        }
        
        return result;
    }
    
    /**
     * 导入自定义字典
     * @param customDictPath 自定义字典路径
     * @param defaultDictPath 默认字典路径
     * @param fs 文件系统适配器
     * @param reloadTranslation 重新加载翻译的回调函数
     */
    async importCustomDictionary(
        customDictPath: string,
        defaultDictPath: string,
        fs: FileSystemAdapter,
        reloadTranslation: (path: string) => Promise<void>
    ): Promise<void> {
        try {
            if (!await fs.exists(customDictPath)) {
                new Notice(this.translate("custom_dict_not_found", "Custom dictionary not found: {path}", { path: customDictPath }));
                return;
            }
            
            // 读取自定义字典
            const customContent = await fs.read(customDictPath);
            let customDict: MultiLanguageDictionary;
            
            try {
                customDict = JSON.parse(customContent);
            } catch (error) {
                new Notice(this.translate("invalid_dict_format", "Invalid dictionary format"));
                return;
            }
            
            // 读取默认字典
            let defaultDict: MultiLanguageDictionary = {};
            if (await fs.exists(defaultDictPath)) {
                const defaultContent = await fs.read(defaultDictPath);
                try {
                    defaultDict = JSON.parse(defaultContent);
                } catch (error) {
                    ErrorHandler.warning(
                        "读取默认字典失败，将使用自定义字典覆盖",
                        error as Error,
                        { path: defaultDictPath }
                    );
                }
            }
            
            // 合并字典，优先使用自定义字典的内容
            const mergedDict = this.mergeWithPriority(defaultDict, customDict);
            
            // 写入默认字典
            const jsonString = JSON.stringify(mergedDict, null, 4);
            await fs.write(defaultDictPath, jsonString);
            
            // 通知用户
            new Notice(this.translate("custom_dict_imported", "Custom dictionary imported successfully"));
            
            // 刷新翻译
            await reloadTranslation(defaultDictPath);
        } catch (error) {
            ErrorHandler.error(
                "导入自定义字典失败",
                error as Error,
                { customPath: customDictPath, defaultPath: defaultDictPath }
            );
            new Notice(this.translate("custom_dict_import_failed", "Failed to import custom dictionary") + ": " + (error as Error).message);
        }
    }
    
    /**
     * 合并字典，优先使用第二个字典的内容
     * @param dict1 第一个字典
     * @param dict2 第二个字典（优先）
     * @returns 合并后的字典
     */
    private mergeWithPriority(dict1: MultiLanguageDictionary, dict2: MultiLanguageDictionary): MultiLanguageDictionary {
        const result: MultiLanguageDictionary = { ...dict1 };
        
        // 遍历优先字典的所有语言
        for (const lang in dict2) {
            if (!result[lang]) {
                // 如果基础字典没有这个语言，直接添加
                result[lang] = { ...dict2[lang] };
            } else {
                // 如果基础字典有这个语言，合并条目，优先使用dict2的内容
                result[lang] = { ...result[lang], ...dict2[lang] };
            }
        }
        
        return result;
    }
    
    /**
     * 导出未翻译文本
     * @param texts 未翻译的文本数组
     * @param pluginDir 插件目录
     * @param fs 文件系统适配器
     */
    async exportUntranslated(texts: string[], pluginDir: string, fs: FileSystemAdapter): Promise<void> {
        await exportUntranslatedTexts(texts, this.language, pluginDir, fs);
    }
    
    /**
     * 获取字典更新状态
     * @returns 上次更新时间和是否可以更新
     */
    getDictionaryUpdateStatus(): { lastUpdate: Date; canUpdate: boolean } {
        const now = Date.now();
        const updateInterval = 24 * 60 * 60 * 1000; // 24小时
        const lastUpdate = new Date(this.lastUpdateTime);
        const canUpdate = (now - this.lastUpdateTime >= updateInterval) || this.lastUpdateTime === 0;
        
        return { lastUpdate, canUpdate };
    }
}