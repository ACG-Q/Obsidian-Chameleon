import { Debouncer, FileSystemAdapter } from "obsidian";

/**
 * 插件设置接口
 */
export interface IPluginSettings {
    /**
     * 翻译标识
     */
    translationMark: {
        /**
         * 是否显示翻译标识
         */
        show: boolean;
        /**
         * 翻译标识文本
         */
        mark: string;
    };
    /**
     * 自定义字典文件路径
     */
    customDictionaryFile: string;
    /**
     * 是否记录未翻译文本
     */
    recordUntranslated: boolean;

    /**
     * 是否启用调试打印
     */
    isDebug: boolean;
}

/**
 * 翻译函数类型定义
 */
export type TranslateFunction = (
    key: string,
    defaultValue: string,
    params?: Record<string, string>,
    lang?: string
) => string

/**
 * 插件接口定义
 */
export interface IPlugin {
    /**
     * 插件设置
     */
    settings: IPluginSettings;
    /**
     * Obsidian 文件系统适配器
     */
    fs: FileSystemAdapter;
    /**
     * 语言
     */
    language: string;
    /**
     * 该路径为normalizedPath
     */
    defaultDictionaryPath: string;
    /**
     * 更新字典(防抖)
     */
    updateDictionaryByDebounce: Debouncer<[], void>;
    /**
     * 保存数据(防抖)
     */
    saveDataByDebounce: Debouncer<[], Promise<void>>
    /**
     * 需要被加载的字典路径
     */
    dictionaryPath: string;
    /**
     * 更新状态栏
     * @param count 数量
     * @returns 
     */
    updateStatusBar: (count: string) => void;
    /**
     * 保存插件设置
     * @returns 
     */
    saveSettings: () => Promise<void>;
    /**
     * 导出未翻译的文本
     * @returns 
     */
    exportUntranslatedText: () => Promise<void>;
    /**
     * 重新导入翻译
     * @param file 文件路径
     * @returns 
     */
    reloadTranslation: (file: string) => Promise<void>;
    /**
     * 翻译函数
     * @param key 翻译id
     * @param defaultValue 没有找到对应的翻译时, 使用的默认翻译
     * @param params 翻译参数
     * @param lang 指定获取的翻译的语言
     * @returns 
     */
    translate: TranslateFunction;
}

/**
 * 字典类型定义
 */
export type Dictionary = Record<string, string>;

/**
 * 多语言字典类型定义
 */
export type MultiLanguageDictionary = Record<string, Dictionary>;