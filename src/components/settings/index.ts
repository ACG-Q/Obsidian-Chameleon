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

        // 创建选项卡容器
        const tabs = containerEl.createDiv({ cls: "chameleon-tabs" });
        const tabList = [
            { id: "functional", label: translate("functional_settings", "Functional Settings") },
            { id: "debug", label: translate("debug_development", "Debug Development") }
        ];
        let activeTab = "functional";

        // 内容区
        const contentArea = containerEl.createDiv();

        // 渲染Tab内容
        const renderTabContent = (tabId: string) => {
            contentArea.empty();
            if (tabId === "functional") {
                FunctionalArea.display(contentArea, translate, {
                    pluginIdentifier: this.plugin.manifest.id,
                    getUntranslatedFilePath: this.getUntranslatedFilePath.bind(this),
                    getPluginSetting: this.getPluginSetting.bind(this),
                    setPluginSetting: this.setPluginSetting.bind(this),
                    updateStatus: (count: number) => this.plugin.updateStatusBar(count.toString()),
                    reloadTranslationFile: (path: string) => this.plugin.reloadTranslation(path)
                });
            } else if (tabId === "debug") {
                DebugDevelopment.display(contentArea, translate, {
                    openPluginFolder: this.openPluginFolder.bind(this),
                    resetPlugin: this.resetPlugin.bind(this),
                    isDebug: this.plugin.settings.isDebug,
                    toggleDebug: this.toggleDebug.bind(this),
                    exportUntranslatedContent: () => this.plugin.exportUntranslatedText(),
                    updateBuiltInDictionary: () => this.plugin.updateDictionaryByDebounce()
                });
            }
        };

        // 渲染Tab头
        tabList.forEach(tab => {
            const btn = tabs.createEl("button", { text: tab.label, cls: "chameleon-tab" });
            if (tab.id === activeTab) btn.addClass("active");
            btn.onclick = () => {
                if (activeTab === tab.id) return;
                activeTab = tab.id;
                // 切换激活样式
                Array.from(tabs.children).forEach((el, idx) => {
                    el.classList.toggle("active", tabList[idx].id === activeTab);
                });
                // 渲染内容
                renderTabContent(activeTab);
            };
        });

        // 初始渲染
        renderTabContent(activeTab);
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