/**
 * 调试开发区域组件
 * 负责渲染插件调试和开发相关设置界面
 */

import { Notice, Setting } from "obsidian";
import { TranslateFunction } from "../../interfaces";

/**
 * 调试开发区域组件接口
 */
interface DebugDevelopmentOptions {
    openPluginFolder: () => Promise<void>;
    resetPlugin: () => Promise<void>;
    isDebug: boolean;
    toggleDebug: (toggle: boolean) => Promise<void>;
}

/**
 * 调试开发区域组件
 */
export class DebugDevelopment {
    /**
     * 显示调试开发区域设置
     * @param containerEl 容器元素
     * @param translate 翻译函数
     * @param options 调试开发区域选项
     */
    static display(containerEl: HTMLElement, translate: TranslateFunction, options: DebugDevelopmentOptions): void {
        const { openPluginFolder, resetPlugin, isDebug, toggleDebug } = options;
        
        containerEl.createEl("h3", { text: translate("debug_development", "Debug Development") });

        // 重启
        new Setting(containerEl)
            .setName(translate("restart_plugin", "Restart Plugin"))
            .setDesc(translate("restart_plugin_desc", "Restart the plugin to apply the new language"))
            .addButton((btn) => {
                btn
                    .setClass("mod-destructive")
                    .setButtonText(translate("restart", "Restart"))
                    .onClick(() => {
                        // 重启Obsidian
                        window.location.reload();
                    });
            });

        // 重载插件
        new Setting(containerEl)
            .setName(translate("overload_plugin", "Reload plugin"))
            .setDesc(translate("overload_plugin_desc", "Reload the plugin to apply the new language"))
            .addButton((btn) => {
                btn
                    .setButtonText(translate("overload", "Reload"))
                    .setClass("mod-cta")
                    .onClick(async () => {
                        await resetPlugin();
                    });
            });

        // 打开插件目录
        new Setting(containerEl)
            .setName(translate("open_plugin_directory", "Open Plugin Directory"))
            .setDesc(translate("open_plugin_directory_desc", "Open the plugin directory in the file manager"))
            .addButton((btn) => {
                btn
                    .setClass("mod-cta")
                    .setButtonText(translate("open", "Open"))
                    .onClick(async () => {
                        await openPluginFolder();
                    });
            });

        // 启用调试
        new Setting(containerEl)
            .setName(translate("enable_debug", "Enable Debug"))
            .setDesc(translate("enable_debug_desc", "Enable debug mode to see more information in the console"))
            .addToggle((toggle) => {
                toggle
                    .setValue(isDebug)
                    .onChange(async (value) => {
                        await toggleDebug(value);
                        new Notice(
                            value 
                                ? translate("debug_mode_enabled", "Debug mode enabled") 
                                : translate("debug_mode_disabled", "Debug mode disabled")
                        );
                    });
            });
    }
}