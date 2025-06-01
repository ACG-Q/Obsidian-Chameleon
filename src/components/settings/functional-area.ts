/**
 * 功能区域组件
 * 负责渲染插件功能设置界面
 */

import { Notice, Setting } from "obsidian";
import { IPluginSettings, TranslateFunction } from "../../interfaces";

/**
 * 功能区域组件接口
 */
interface FunctionalAreaOptions {
    pluginIdentifier: string;
    getUntranslatedFilePath: (full?: boolean) => string;
    getPluginSetting: <T extends keyof IPluginSettings>(key: T) => IPluginSettings[T];
    setPluginSetting: <T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]) => Promise<void>;
    updateStatus: (count: number) => void;
    exportUntranslatedContent?: () => Promise<void>;
    reloadTranslationFile: (path: string) => Promise<void>;
    updateBuiltInDictionary?: () => void;
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 */
const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
};

/**
 * 创建文件选择器
 * @param id 选择器ID
 * @param translate 翻译函数
 * @param onChange 文件选择变更回调
 */
const createFileSelector = (id: string, translate: TranslateFunction, onChange: (e: Event) => void) => {
    return (fragment: DocumentFragment) => {
        fragment.createEl("span", { text: translate("select_dictionary_file_path", "Select Dictionary File Path") });
        fragment.createEl("span", { text: translate("default_dictionary_path", "Specify a custom dictionary file path, the default path is dictionary.json in the plugin directory") });
        fragment.createEl("input", { type: "file" }, (el) => {
            el.accept = ".json";
            el.style.display = "none";
            el.id = id;
            el.onchange = onChange;
        });
    };
};

/**
 * 功能区域组件
 */
export class FunctionalArea {
    /**
     * 显示功能区域设置
     * @param containerEl 容器元素
     * @param translate 翻译函数
     * @param options 功能区域选项
     */
    static display(containerEl: HTMLElement, translate: TranslateFunction, options: FunctionalAreaOptions): void {
        const { 
            pluginIdentifier, 
            getUntranslatedFilePath, 
            getPluginSetting, 
            setPluginSetting, 
            updateStatus, 
            exportUntranslatedContent, 
            reloadTranslationFile, 
            updateBuiltInDictionary 
        } = options;

        containerEl.createEl("h3", { text: translate("functional_area", "Functional Area") });

        const recordUntranslated = getPluginSetting("recordUntranslated");
        const customDictionaryFile = getPluginSetting("customDictionaryFile");
        const translationMark = getPluginSetting("translationMark");

        // 是否记录未翻译字符串
        new Setting(containerEl)
            .setName(translate("record_untranslated_strings", "Record Untranslated Strings"))
            .setDesc(translate("record_untranslated_strings_desc", "Whether to record untranslated strings to the list"))
            .addToggle((toggle) =>
                toggle
                    .setValue(recordUntranslated)
                    .onChange(async (value) => {
                        await setPluginSetting("recordUntranslated", value);
                        updateStatus(0);
                    })
            );

        // 添加翻译标识的开关
        new Setting(containerEl)
            .setName(translate("add_translation_mark", "Add Translation Mark"))
            .setDesc(translate("add_translation_mark_desc", "Whether to add a mark at the beginning of the translated text"))
            .addToggle((toggle) =>
                toggle
                    .setValue(translationMark.show)
                    .onChange(async (value) => {
                        await setPluginSetting("translationMark", { show: value, mark: translationMark.mark });
                    })
            );

        // 自定义翻译标识
        new Setting(containerEl)
            .setName(translate("translation_mark", "Translation Mark"))
            .setDesc(translate("translation_mark_desc", "Customize the mark for the translated text"))
            .addText((text) =>
                text
                    .setValue(translationMark.mark)
                    .onChange(async (value) => {
                        await setPluginSetting("translationMark", { show: translationMark.show, mark: value });
                    })
            );

        // 添加自定义字典文件路径设置
        const fileSelectorId = pluginIdentifier + "-file-selector";
        const fileSelectorInputId = pluginIdentifier + "-file-selector-input";
        const fileSelectorOnChange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!(target && target.files && target.files.length > 0)) {
                return new Notice(translate("unselected_file", "No file selected"));
            }
            const file = target.files[0];
            const path = (file as any).path;

            // 更新UI显示
            const fileSelectorInput = document.getElementById(fileSelectorInputId) as HTMLInputElement;
            if (fileSelectorInput) {
                fileSelectorInput.value = path;
            }
            await setPluginSetting("customDictionaryFile", path);

            // 更新字典内容
            await reloadTranslationFile(path);
            new Notice(translate("dictionary_loaded", "Dictionary file loaded: {path}", { path }));
        };

        const desc = createFragment(createFileSelector(fileSelectorId, translate, fileSelectorOnChange));
        new Setting(containerEl)
            .setName(translate("custom_dictionary_file", "Custom Dictionary File"))
            .setDesc(desc)
            .addText((text) => {
                // 添加ID
                text.setValue(customDictionaryFile).onChange(async (value) => {
                    await setPluginSetting("customDictionaryFile", value);
                });

                text.inputEl.id = fileSelectorInputId;
                return text;
            })
            .addExtraButton((btn) => {
                // 添加文件选择
                btn.setIcon("file").onClick(async () => {
                    document.getElementById(fileSelectorId)?.click();
                });
            });
    }
}