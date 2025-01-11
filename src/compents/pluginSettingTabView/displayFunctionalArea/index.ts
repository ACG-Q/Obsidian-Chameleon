import { Notice, Setting } from "obsidian";
import { IPluginSettings, translateType } from "src/interface";

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

// 文件选择器
const createFileSelector = (id: string, translate: translateType, onChange: (e: Event) => void) => {
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

const displayFunctionalArea = (containerEl: HTMLElement, translate: translateType, opt: {
    pluginIdentifier: string;
    getUntranslatedFilePath: (full?: boolean) => string;
    getPluginSetting: <T extends keyof IPluginSettings>(key: T) => IPluginSettings[T] ,
    setPluginSetting: <T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]) => Promise<void>,
    updateStatus: (count: number) => void,
    exportUntranslatedContent: () => Promise<void>,
    reloadTranslationFile: (path:string)=>Promise<void>,
    updateBuiltInDictionary: () => void
}) => {
    const { pluginIdentifier, getUntranslatedFilePath, getPluginSetting, setPluginSetting, updateStatus, exportUntranslatedContent, reloadTranslationFile, updateBuiltInDictionary } = opt;

    containerEl.createEl("h3", { text: translate("functional_area", "Functional Area") });

    const recordUntranslated = getPluginSetting("recordUntranslated");
    const customDictionaryFile = getPluginSetting("customDictionaryFile");
    const translationMark = getPluginSetting("translationMark")

    const setCustomDictionaryFile = async (value: string) => {
        await setPluginSetting("customDictionaryFile", value);
    };

    const setTranslationMark = async (value: IPluginSettings["translationMark"]) => {
        await setPluginSetting("translationMark", value);
    };

    // 是否记录未翻译字符串
    new Setting(containerEl)
        .setName(translate("record_untranslated_strings", "Record Untranslated Strings"))
        .setDesc(translate("record_untranslated_strings_desc", "Whether to record untranslated strings to the list"))
        .addToggle((toggle) =>
            toggle
                .setValue(recordUntranslated)
                .onChange(async (value) => {
                    await setPluginSetting("recordUntranslated", value)
                    updateStatus(0);
                })
        );

    const createExportUntranslatedSettingsDescEleByUnexport = (fragment: DocumentFragment) => { };

    const createExportUntranslatedSettingsDescEleByExport = (fragment: DocumentFragment) => {
        fragment.createEl("span", {
            text: createFragment((f) => {
                f.createEl("span", { text: translate("untranslated_text_will_export_to", "Untranslated text will be exported to ") });
                f.createEl(
                    "b", { text: getUntranslatedFilePath(), title: translate("click_to_copy_to_clipboard", "Click to copy to clipboard") },
                    (el) => {
                        el.onclick = () => {
                            copyToClipboard(getUntranslatedFilePath(true));
                            new Notice(translate("file_path_copied_to_clipboard", "File path copied to clipboard"));
                        };
                        el.style.cursor = "pointer";
                        el.style.color = "var(--interactive-accent)";
                        el.style.textDecoration = "underline";
                        el.style.margin = "0 5px";
                        el.style.fontWeight = "bold";
                    }
                );
                f.createEl("span", { text: translate("please_check", ", please check!") });
            }),
        });
    };

    // 添加导出未翻译文本的开关
    const exportUntranslatedSettings = new Setting(containerEl)
        .setName(translate("export_untranslated_text", "Export Untranslated Text"))
        .setDesc(createFragment(createExportUntranslatedSettingsDescEleByUnexport))
        .addButton((btn) => {
            btn
                .setButtonText(translate("export", "Export"))
                .onClick(async () => {
                    new Notice(translate("exporting", "Exporting... Please wait..."));
                    await exportUntranslatedContent()
                    new Notice(translate("exported", "Untranslated text exported"));
                    exportUntranslatedSettings.descEl.empty();
                    exportUntranslatedSettings.setDesc(createFragment(createExportUntranslatedSettingsDescEleByExport));
                });
        });

    // 添加翻译标识的开关
    new Setting(containerEl)
        .setName(translate("add_translation_mark", "Add Translation Mark"))
        .setDesc(translate("add_translation_mark_desc", "Whether to add a mark at the beginning of the translated text"))
        .addToggle((toggle) =>
            toggle
                .setValue(translationMark.show)
                .onChange(async (value) => {
                    await setTranslationMark({ show: value, mark: translationMark.mark })
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
                    await setTranslationMark({ show: translationMark.show, mark: value })
                })
        );


    // 添加自定义字典文件路径设置
    const fileSelectorId = pluginIdentifier + "-file-selector";
    const fileSelectorInputId = pluginIdentifier + "-file-selector-input";
    const fileSelectorOnChange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (!(target && target.files && target.files.length > 0)) return new Notice(translate("unselected_file", "No file selected"));
        const file = target.files[0];
        const path = (file as any).path;

        // 更新UI显示
        const fileSelectorInput = document.getElementById(fileSelectorInputId) as HTMLInputElement;
        if (fileSelectorInput) {
            fileSelectorInput.value = path;
        }
        await setCustomDictionaryFile(path)

        // 更新字典内容
        await reloadTranslationFile(path)
        new Notice(translate("dictionary_loaded", "Dictionary file loaded: {path}", { path }));
    };

    const desc = createFragment(createFileSelector(fileSelectorId, translate, fileSelectorOnChange))
    new Setting(containerEl)
        .setName(translate("custom_dictionary_file", "Custom Dictionary File"))
        .setDesc(desc)
        .addText((text) => {
            // 添加ID
            text.setValue(customDictionaryFile).onChange(async (value) => {
                await setCustomDictionaryFile(value)
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


    // 更新内置字典
    new Setting(containerEl)
        .setName(translate("update_builtin_dictionary", "Update Built-in Dictionary"))
        .setDesc(translate("update_builtin_dictionary_desc", "Update the built-in dictionary file"))
        .addButton((btn) => {
            btn
                .setButtonText(translate("update", "Update"))
                .onClick(async () => {
                    new Notice(translate("updating", "Updating... Please wait..."));
                    updateBuiltInDictionary()
                })
        })
}

export default displayFunctionalArea;