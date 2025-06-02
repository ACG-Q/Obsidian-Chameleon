/**
 * 调试开发区域组件
 * 负责渲染插件调试和开发相关设置界面
 */

import { Notice, Setting } from "obsidian";
import { IPluginSettings, TranslateFunction } from "../../interfaces";
import { detectLanguages } from "../../utils/lang-detect";
import { ExportModal } from "../modals/export-modal";
import { App } from "obsidian";
import { MASK, MASK_ATTRIBUTE } from "src/constants";

interface UntranslatedString {
    text: string;
    context?: string;
    source?: string;
}

/**
 * 调试开发区域组件接口
 */
interface DebugDevelopmentOptions {
    openPluginFolder: () => Promise<void>;
    resetPlugin: () => Promise<void>;
    isDebug: boolean;
    toggleDebug: (toggle: boolean) => Promise<void>;
    exportUntranslatedContent?: (selectedStrings: string[], format: string) => Promise<string>;
    updateBuiltInDictionary?: () => Promise<void>;
    getPluginSetting: <T extends keyof IPluginSettings>(key: T) => IPluginSettings[T];
    setPluginSetting: <T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]) => Promise<void>;
    updateStatus: (status: string) => void;
    getUntranslatedList: () => string[];
    app: App;
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
        const { openPluginFolder, resetPlugin, isDebug, toggleDebug, getPluginSetting, setPluginSetting, updateStatus } = options;
        
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

        // 导出未翻译文本
        const exportSetting = new Setting(containerEl)
            .setName(translate("export_untranslated_text", "Export Untranslated Text"))
            .setDesc(translate("exporting", "Export untranslated strings to a file for dictionary improvement"))
            .addButton((btn) => {
                btn
                    .setButtonText(translate("export", "Export"))
                    .onClick(async () => {
                        // 获取真实未翻译字符串列表
                        const untranslatedList = options.getUntranslatedList() ?? [];
                        const modal = new ExportModal(
                            options.app,
                            translate,
                            untranslatedList,
                            async (exportOptions) => {
                                try {
                                    new Notice(translate("exporting", "Exporting... Please wait..."));
                                    // 只导出选中的字符串，并获取实际路径
                                    const filePath = await options.exportUntranslatedContent?.(exportOptions.selectedStrings, exportOptions.format);
                                    new Notice(translate("exported", "Untranslated text exported"));
                                    
                                    // 创建可点击复制的描述文本
                                    exportSetting.descEl.empty(); // 先清空，避免多条
                                    const descContainer = exportSetting.descEl.createDiv("export-path-container");
                                    descContainer.createEl("span", { 
                                        text: translate("untranslated_text_will_export_to", "Untranslated text will be exported to ")
                                    });
                                    
                                    const pathSpan = descContainer.createEl("span", { 
                                        text: filePath,
                                        cls: "export-path"
                                    });
                                    pathSpan.setAttribute(MASK_ATTRIBUTE, MASK);
                                    pathSpan.setAttribute("title", translate("click_to_copy_to_clipboard", "Click to copy to clipboard"));
                                    pathSpan.onclick = () => {
                                        navigator.clipboard.writeText(pathSpan.textContent || "");
                                        new Notice(translate("file_path_copied_to_clipboard", "File path copied to clipboard"));
                                    };
                                    
                                    descContainer.createEl("span", { 
                                        text: translate("please_check", ", please check!")
                                    });
                                } catch (error) {
                                    new Notice(translate("export_failed", "Export failed: {error}", { error: error.message }));
                                }
                            });
                        modal.open();
                    });
            });

        // 更新内置字典
        new Setting(containerEl)
            .setName(translate("update_builtin_dictionary", "Update Built-in Dictionary"))
            .setDesc(translate("update_builtin_dictionary_desc", "Update the built-in dictionary file"))
            .addButton((btn) => {
                btn
                    .setButtonText(translate("update", "Update"))
                    .onClick(async () => {
                        new Notice(translate("updating", "Updating... Please wait..."));
                        options.updateBuiltInDictionary?.();
                    });
            });

        // 是否启用调试打印
        new Setting(containerEl)
            .setName(translate("enable_debug_print", "Enable Debug Print"))
            .setDesc(translate("enable_debug_print_desc", "Whether to enable debug print"))
            .addToggle((toggle) =>
                toggle
                    .setValue(getPluginSetting("isDebug"))
                    .onChange(async (value) => {
                        await setPluginSetting("isDebug", value);
                        updateStatus("0");
                    })
            );

        // 语言检测测试
        let testValue = "";
        new Setting(containerEl)
            .setName(translate("language_detection_test", "Language Detection Test"))
            .setDesc(translate("language_detection_test_desc", "Test language detection with sample text"))
            .addText((text) => {
                text
                    .setPlaceholder(translate("enter_text_to_test", "Enter text to test"))
                    .onChange((value) => {
                        testValue = value;
                    });
            })
            .addButton((btn) => {
                btn.setButtonText(translate("detect", "Detect"))
                    .onClick(() => {
                        if (testValue) {
                            const result = detectLanguages(testValue);
                            new Notice(translate("detection_result", "Detection Result: {result}", { result: JSON.stringify(result) }));
                        } else {
                            new Notice(translate("enter_text_to_test", "Enter text to test"));
                        }
                    });
            });
    }
}