/**
 * Obsidian-Chameleon 插件主入口文件
 */

import {
	Debouncer,
	FileSystemAdapter,
	Notice,
	Plugin,
	debounce,
	getIcon,
} from "obsidian";
import { IPluginSettings, TranslateFunction } from "./interfaces";
import { DEFAULT_SETTINGS } from "./constants";
import { TranslationService } from "./services/translation-service";
import { SettingsService } from "./services/settings-service";
import locales from './locales/i18n.json';
import SettingsTab from "./components/settings";
import { ErrorHandler } from "./utils/error-handler";

/**
 * Chameleon 插件主类
 */
export default class Chameleon extends Plugin {
    settings: IPluginSettings = DEFAULT_SETTINGS;
    fs: FileSystemAdapter;
    language: string = "";
    defaultDictionaryPath: string = "";
    dictionaryPath: string = "";
    
    private translationService: TranslationService;
    private settingsService: SettingsService;
    private statusBarItem: HTMLElement;
    
    // 防抖函数
    updateDictionaryByDebounce: Debouncer<[], void>;
    saveDataByDebounce: Debouncer<[], Promise<void>>;
    private updateStatusBarByDebounce: Debouncer<[count: string], void>;
    
    /**
     * 获取插件设置
     * @param key 设置键
     * @returns 设置值
     */
    getPluginSetting<T extends keyof IPluginSettings>(key: T): IPluginSettings[T] {
        return this.settings[key];
    }

    /**
     * 设置插件设置
     * @param key 设置键
     * @param value 设置值
     */
    async setPluginSetting<T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]): Promise<void> {
        this.settings[key] = value;
        await this.saveSettings();
    }

    /**
     * 插件加载时的初始化操作
     */
    async onload() {
        // 初始化文件系统适配器
        this.fs = this.app.vault.adapter as FileSystemAdapter;
        
        // 获取当前语言
        this.language = document.querySelector("html")?.getAttr("lang") || "";
        
        // 初始化错误处理器
        ErrorHandler.setPrefix("[Chameleon]");
        
        // 初始化服务
        this.translationService = new TranslationService(locales, this.language);
        this.settingsService = new SettingsService(this, this.settings);
        
        // 创建状态栏
        this.statusBarItem = this.addStatusBarItem();
        
        // 初始化防抖函数
        this.updateStatusBarByDebounce = debounce(this.updateStatusBar.bind(this), 500);
        this.updateDictionaryByDebounce = debounce(this.updateDictionary.bind(this), 500);
        this.saveDataByDebounce = debounce(async () => await this.settingsService.saveSettings(), 1000);
        
        // 加载插件设置
        await this.settingsService.loadSettings();
        this.settings = this.settingsService.getSettings();
        
        // 设置错误处理器的调试模式
        ErrorHandler.setDebugMode(this.settings.isDebug);
        
        // 添加设置面板
        this.addSettingTab(new SettingsTab(this.app, this));
        
        // 获取字典路径
        this.defaultDictionaryPath = this.manifest.dir + "/dictionary.json";
        this.dictionaryPath = this.settings.customDictionaryFile || this.defaultDictionaryPath;
        
        // 初始化翻译服务
        await this.translationService.initialize(
            this.settings,
            this.fs,
            this.defaultDictionaryPath,
            this.updateStatusBarByDebounce,
            this.debug.bind(this)
        );
        
        // 绑定翻译函数
        this.translate = this.translationService.getTranslateFunction();
        
        // 加载样式
        this.loadStyles();
    }
    
    /**
     * 插件卸载时的操作
     */
    onunload() {
        // 清理资源
        this.translationService.cleanup();
    }
    
    /**
     * 翻译方法
     * 这里只是一个占位符，实际实现将在onload中绑定
     */
    translate: TranslateFunction = (key, defaultValue, params, lang) => defaultValue;
    
    /**
     * 更新状态栏方法
     * @param count 未翻译文本数量
     */
    updateStatusBar(count: string) {
        if (this.settings.recordUntranslated) {
            this.statusBarItem.setText(createFragment((f) => {
                f.append(getIcon("languages") as never);
                f.createEl("span", { 
                    text: count, 
                    title: this.translate("untranslated_strings", "Untranslated strings: {count}", { count })
                });
            }));
        } else {
            this.statusBarItem.empty();
        }
    }
    
    /**
     * 更新字典方法
     */
    async updateDictionary() {
        await this.translationService.updateDictionary(
            this.defaultDictionaryPath,
            this.dictionaryPath,
            this.fs
        );
    }
    
    /**
     * 重新加载翻译方法
     * @param file 文件路径
     */
    async reloadTranslation(file: string) {
        await this.translationService.reloadTranslation(file, this.fs);
    }
    
    /**
     * 调试输出方法
     * @param args 要输出的内容
     */
    private debug(...args: unknown[]) {
        ErrorHandler.debug(...args);
    }
    
    /**
     * 保存设置方法
     */
    async saveSettings() {
        this.saveDataByDebounce();
    }

    private loadStyles(): void {
        this.registerDomEvent(document, "DOMContentLoaded", () => {
            this.loadStyles();
        });
    }

    getUntranslatedList(): string[] {
        return this.translationService.getUntranslatedList();
    }

    /**
     * 导出未翻译文本
     * @param selectedStrings 选中的未翻译字符串
     * @param format 导出格式
     */
    async exportUntranslatedText(selectedStrings: string[], format: string): Promise<string> {
        const pluginDir = this.manifest.dir || "";
        return await this.translationService.exportUntranslated(selectedStrings, format, pluginDir, this.fs);
    }
}