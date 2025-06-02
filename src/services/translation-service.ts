/**
 * 翻译服务
 * 作为核心层和UI层之间的桥梁，提供高级翻译功能
 */

import { FileSystemAdapter } from "obsidian";
import { Translator } from "../core/translator";
import { IPluginSettings, TranslateFunction } from "../interfaces";
import { DictionaryService } from "./dictionary-service";

/**
 * 翻译服务类
 * 整合翻译器和字典服务，提供完整的翻译功能
 */
export class TranslationService {
    private translator: Translator;
    private dictionaryService: DictionaryService;
    private language: string;
    
    /**
     * 构造函数
     * @param locales 翻译资源
     * @param language 当前语言
     */
    constructor(
        locales: { [key: string]: { [key: string]: string } },
        language: string
    ) {
        this.translator = new Translator(locales, language);
        this.language = language;
        // 初始化字典服务时需要翻译函数，所以在initialize中完成初始化
    }
    
    /**
     * 初始化翻译服务
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
        // 先初始化翻译器
        await this.translator.initialize(
            settings,
            fs,
            defaultDictionaryPath,
            updateStatusBar,
            debug
        );
        
        // 初始化字典服务
        const translateFunc = this.translator.translate.bind(this.translator);
        this.dictionaryService = new DictionaryService(
            this.language,
            translateFunc
        );
        
        // 初始化字典服务
        await this.dictionaryService.initialize(
            settings.customDictionaryFile || defaultDictionaryPath,
            fs
        );
    }
    
    /**
     * 获取翻译函数
     * @returns 翻译函数
     */
    getTranslateFunction(): TranslateFunction {
        return this.translator.translate.bind(this.translator);
    }
    
    /**
     * 处理文本翻译
     * @param settings 插件设置
     * @param updateStatusBar 更新状态栏的回调函数
     * @param debug 调试输出函数
     */
    processTranslation(
        settings: IPluginSettings,
        updateStatusBar: (count: string) => void,
        debug: (...args: unknown[]) => void
    ): void {
        this.translator.processText(settings, updateStatusBar, debug);
    }
    
    /**
     * 更新字典
     * @param defaultDictionaryPath 默认字典路径
     * @param dictionaryPath 当前使用的字典路径
     * @param fs 文件系统适配器
     * @param forceUpdate 是否强制更新，忽略更新间隔限制
     */
    async updateDictionary(
        defaultDictionaryPath: string,
        dictionaryPath: string,
        fs: FileSystemAdapter,
        forceUpdate: boolean = false
    ): Promise<void> {
        // 使用增强的字典服务更新在线字典
        await this.dictionaryService.updateOnlineDictionary(
            defaultDictionaryPath,
            dictionaryPath,
            fs,
            async (path: string) => {
                await this.translator.reloadTranslation(path, fs);
            },
            forceUpdate
        );
    }
    
    /**
     * 导出未翻译文本
     * @param selectedStrings 选中的未翻译字符串
     * @param format 导出格式
     * @param pluginDir 插件目录
     * @param fs 文件系统适配器
     */
    async exportUntranslated(selectedStrings: string[], format: string, pluginDir: string, fs: FileSystemAdapter): Promise<string> {
        const untranslatedTexts = this.translator.getUntranslatedTexts();
        const exportList = untranslatedTexts.filter(text => selectedStrings.includes(text));
        let content = "";
        if (format === "json") {
            content = JSON.stringify(exportList, null, 2);
        } else {
            content = exportList.join("\n");
        }
        const filePath = `${pluginDir}/untranslated-to-${this.language}.${format}`;
        await fs.write(filePath, content);
        return filePath;
    }
    
    /**
     * 重新加载翻译
     * @param path 字典路径
     * @param fs 文件系统适配器
     */
    async reloadTranslation(path: string, fs: FileSystemAdapter): Promise<void> {
        await this.translator.reloadTranslation(path, fs);
    }
    
    /**
     * 清理资源
     */
    cleanup(): void {
        this.translator.cleanup();
    }
    
    /**
     * 获取字典更新状态
     * @returns 上次更新时间和是否可以更新
     */
    getDictionaryUpdateStatus(): { lastUpdate: Date; canUpdate: boolean } {
        return this.dictionaryService.getDictionaryUpdateStatus();
    }
    
    /**
     * 导入自定义字典
     * @param customDictPath 自定义字典路径
     * @param defaultDictPath 默认字典路径
     * @param fs 文件系统适配器
     */
    async importCustomDictionary(
        customDictPath: string,
        defaultDictPath: string,
        fs: FileSystemAdapter
    ): Promise<void> {
        await this.dictionaryService.importCustomDictionary(
            customDictPath,
            defaultDictPath,
            fs,
            async (path: string) => {
                await this.translator.reloadTranslation(path, fs);
            }
        );
    }
    
    /**
     * 获取未翻译字符串列表
     * @returns 未翻译字符串详细信息
     */
    getUntranslatedList(): string[] {
        return this.translator.getUntranslatedTexts()
    }
}