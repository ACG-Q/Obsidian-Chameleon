/**
 * 翻译器核心模块
 * 负责翻译功能的核心逻辑
 */

import { Dictionary, IPluginSettings } from "../interfaces";
import { loadDictionary, updateBuiltInDictionary, exportUntranslatedTexts } from "./dictionary";
import { replaceText } from "./text-processor";
import { FileSystemAdapter, Notice } from "obsidian";
import EnhancedI18n from "../utils/enhanced-i18n";
import { ErrorHandler } from "../utils/error-handler";

/**
 * 翻译器类
 * 整合字典管理和文本处理功能
 */
export class Translator {
    private dictionary: Dictionary = {};
    private untranslatedTexts: string[] = [];
    private i18n: EnhancedI18n;
    private observer: MutationObserver | null = null;
    
    /**
     * 构造函数
     * @param locales 翻译资源
     * @param language 当前语言
     */
    constructor(
        locales: { [key: string]: { [key: string]: string } },
        private language: string
    ) {
        this.i18n = new EnhancedI18n(locales, language);
    }
    
    /**
     * 初始化翻译器
     * @param settings 插件设置
     * @param fs 文件系统适配器
     * @param defaultDictionaryPath 默认字典路径
     * @param updateStatusBar 更新状态栏的回调函数
     * @param debug 调试输出函数
     */
    async initialize(
        settings: IPluginSettings,
        fs: FileSystemAdapter,
        defaultDictionaryPath: string,
        updateStatusBar: (count: string) => void,
        debug: (...args: unknown[]) => void
    ): Promise<void> {
        // 获取字典路径
        const dictionaryPath = settings.customDictionaryFile || defaultDictionaryPath;
        
        // 加载字典
        this.dictionary = await loadDictionary(
            dictionaryPath,
            this.language,
            fs,
            this.translate.bind(this)
        );
        
        // 设置DOM观察器
        this.setupObserver(settings, updateStatusBar, debug);
    }
    
    /**
     * 设置DOM观察器
     * @param settings 插件设置
     * @param updateStatusBar 更新状态栏的回调函数
     * @param debug 调试输出函数
     */
    private setupObserver(
        settings: IPluginSettings,
        updateStatusBar: (count: string) => void,
        debug: (...args: unknown[]) => void
    ): void {
        // 关闭已有的观察器
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // 创建新的观察器
        this.observer = new MutationObserver(() => {
            this.processText(settings, updateStatusBar, debug);
        });
        
        // 开始观察DOM变化
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
    
    /**
     * 处理文本
     * @param settings 插件设置
     * @param updateStatusBar 更新状态栏的回调函数
     * @param debug 调试输出函数
     */
    processText(
        settings: IPluginSettings,
        updateStatusBar: (count: string) => void,
        debug: (...args: unknown[]) => void
    ): void {
        replaceText(
            this.dictionary,
            settings,
            this.language,
            this.untranslatedTexts,
            updateStatusBar,
            debug
        );
    }
    
    /**
     * 翻译方法
     * @param key 翻译键
     * @param defaultValue 默认值
     * @param params 参数
     * @param lang 语言
     * @returns 翻译后的文本
     */
    translate(key: string, defaultValue: string, params?: Record<string, string>, lang?: string): string {
        return this.i18n.translate(key, defaultValue, params, lang);
    }
    
    /**
     * 更新字典
     * @param defaultDictionaryPath 默认字典路径
     * @param dictionaryPath 当前使用的字典路径
     * @param fs 文件系统适配器
     */
    async updateDictionary(
        defaultDictionaryPath: string,
        dictionaryPath: string,
        fs: FileSystemAdapter
    ): Promise<void> {
        await updateBuiltInDictionary(
            defaultDictionaryPath,
            dictionaryPath,
            fs,
            this.translate.bind(this),
            async (path: string) => {
                this.dictionary = await loadDictionary(
                    path,
                    this.language,
                    fs,
                    this.translate.bind(this)
                );
            }
        );
    }
    
    /**
     * 导出未翻译文本
     * @param pluginDir 插件目录
     * @param fs 文件系统适配器
     */
    async exportUntranslated(pluginDir: string, fs: FileSystemAdapter): Promise<void> {
        await exportUntranslatedTexts(
            this.untranslatedTexts,
            this.language,
            pluginDir,
            fs
        );
    }
    
    /**
     * 重新加载翻译
     * @param path 字典路径
     * @param fs 文件系统适配器
     */
    async reloadTranslation(path: string, fs: FileSystemAdapter): Promise<void> {
        this.dictionary = await loadDictionary(
            path,
            this.language,
            fs,
            this.translate.bind(this)
        );
    }
    
    /**
     * 清理资源
     */
    cleanup(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
    
    /**
     * 获取未翻译文本
     * @returns 未翻译文本数组
     */
    getUntranslatedTexts(): string[] {
        return [...this.untranslatedTexts];
    }
    
    /**
     * 清空未翻译文本
     */
    clearUntranslatedTexts(): void {
        this.untranslatedTexts = [];
    }
}