/**
 * 设置服务
 * 负责管理插件设置
 */

import { Plugin } from "obsidian";
import { IPluginSettings } from "../interfaces";
import { DEFAULT_SETTINGS } from "../constants";

/**
 * 设置服务类
 * 管理插件设置的加载和保存
 */
export class SettingsService {
    /**
     * 构造函数
     * @param plugin Obsidian插件实例
     * @param settings 插件设置
     */
    constructor(
        private plugin: Plugin,
        private settings: IPluginSettings
    ) {}

    /**
     * 加载设置
     * 从Obsidian数据存储中加载插件设置
     */
    async loadSettings(): Promise<void> {
        const data = await this.plugin.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    /**
     * 保存设置
     * 将插件设置保存到Obsidian数据存储
     */
    async saveSettings(): Promise<void> {
        await this.plugin.saveData(this.settings);
    }

    /**
     * 获取设置
     * @returns 当前插件设置
     */
    getSettings(): IPluginSettings {
        return this.settings;
    }

    /**
     * 更新设置
     * @param settings 新的设置对象或部分设置
     */
    async updateSettings(settings: Partial<IPluginSettings>): Promise<void> {
        this.settings = { ...this.settings, ...settings };
        await this.saveSettings();
    }

    /**
     * 重置设置为默认值
     */
    async resetSettings(): Promise<void> {
        this.settings = { ...DEFAULT_SETTINGS };
        await this.saveSettings();
    }
}