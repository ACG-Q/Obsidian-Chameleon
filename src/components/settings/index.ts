/**
 * 设置面板组件
 * 负责渲染插件设置界面
 */

import { App, PluginSettingTab } from "obsidian";
import Chameleon from "../../main";
import { FunctionalArea } from "./functional-area";
import { DebugDevelopment } from "./debug-development";

/**
 * 插件设置面板类
 */
export default class SettingsTab extends PluginSettingTab {
    private plugin: Chameleon;

    /**
     * 构造函数
     * @param app Obsidian应用实例
     * @param plugin 插件实例
     */
    constructor(app: App, plugin: Chameleon) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * 显示设置面板
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const translate = this.plugin.translate;

        // 添加插件描述
        containerEl.createEl("h2", { text: translate("plugin_settings", "Plugin Settings") });
        containerEl.createEl("p", { 
            text: translate("plugin_settings_desc", "Configure the plugin settings") + 
                  "--" + 
                  translate("current_language", "Translation identifier: {lang}", { lang: this.plugin.language })
        });

        // 显示调试开发区域
        DebugDevelopment.display(containerEl, translate, {
            openPluginFolder: this.openPluginFolder.bind(this),
            resetPlugin: this.resetPlugin.bind(this),
            isDebug: this.plugin.settings.isDebug,
            toggleDebug: this.toggleDebug.bind(this)
        });

        // 显示功能区域
        FunctionalArea.display(containerEl, translate, {
            pluginIdentifier: this.plugin.manifest.id,
            getUntranslatedFilePath: this.getUntranslatedFilePath.bind(this),
            getPluginSetting: this.getPluginSetting.bind(this),
            setPluginSetting: this.setPluginSetting.bind(this),
            updateStatus: (count: number) => this.plugin.updateStatusBar(count.toString()),
            exportUntranslatedContent: () => this.plugin.exportUntranslatedText(),
            reloadTranslationFile: (path: string) => this.plugin.reloadTranslation(path),
            updateBuiltInDictionary: () => this.plugin.updateDictionaryByDebounce()
        });
    }

    /**
     * 获取未翻译文本的文件路径
     * @param full 是否返回完整路径
     * @returns 未翻译文本的文件路径
     */
    private getUntranslatedFilePath(full?: boolean): string {
        const pluginDir = this.plugin.manifest.dir;
        const normalizedPath = `${pluginDir}/untranslated-to-${this.plugin.language}.txt`;
        return full ? this.plugin.fs.getFullPath(normalizedPath) : normalizedPath;
    }

    /**
     * 获取插件设置
     * @param key 设置键名
     * @returns 设置值
     */
    private getPluginSetting<T extends keyof typeof this.plugin.settings>(key: T): typeof this.plugin.settings[T] {
        return this.plugin.settings[key];
    }

    /**
     * 设置插件设置
     * @param key 设置键名
     * @param value 设置值
     */
    private async setPluginSetting<T extends keyof typeof this.plugin.settings>(key: T, value: typeof this.plugin.settings[T]): Promise<void> {
        this.plugin.settings[key] = value;
        await this.plugin.saveSettings();
    }

    /**
     * 打开插件目录
     */
    private async openPluginFolder(): Promise<void> {
        (this.app as any).showInFolder(`${this.plugin.manifest.dir}/main.js`);
    }

    /**
     * 重载插件
     */
    private async resetPlugin(): Promise<void> {
        const plugins = (this.app as any).plugins;
        await plugins.disablePlugin(this.plugin.manifest.id);
        await plugins.enablePlugin(this.plugin.manifest.id);
    }

    /**
     * 切换调试模式
     * @param toggle 是否启用调试模式
     */
    private async toggleDebug(toggle: boolean): Promise<void> {
        await this.setPluginSetting("isDebug", toggle);
    }
}