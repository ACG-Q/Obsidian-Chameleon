/**
 * 功能区域组件
 * 负责渲染插件功能设置界面
 */

import { Notice, Setting, App, TFile } from "obsidian";
import { IPluginSettings, TranslateFunction } from "../../interfaces";
import { PageRangeType } from "../../core/text-processor";

/**
 * 功能区域组件接口
 */
interface FunctionalAreaOptions {
    pluginIdentifier: string;
    getPluginSetting: <T extends keyof IPluginSettings>(key: T) => IPluginSettings[T];
    setPluginSetting: <T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]) => Promise<void>;
    updateStatus: (status: string) => void;
    reloadTranslationFile: (path: string) => Promise<void>;
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
            getPluginSetting, 
            setPluginSetting, 
            updateStatus, 
            reloadTranslationFile
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
                        updateStatus("0");
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

        // 翻译页面配置
        containerEl.createEl("h4", { text: translate("translation_pages", "Translation Pages") });

        // 翻译页面配置列表
        const translationPages = getPluginSetting("translationPages");
        
        // 折叠状态记录（全局，防止重渲染丢失）
        const collapseKey = '__chameleonPageCollapseStates';
        if (!(window as any)[collapseKey]) (window as any)[collapseKey] = [];
        const collapseStates = (window as any)[collapseKey] as boolean[];
        while (collapseStates.length < translationPages.length) collapseStates.push(false);
        while (collapseStates.length > translationPages.length) collapseStates.pop();

        // 添加新的页面配置
        new Setting(containerEl)
            .setName(translate("add_page_config", "Add Page Configuration"))
            .setDesc(translate("add_page_config_desc", "Add a new page configuration"))
            .addButton((button) => {
                button
                    .setButtonText(translate("add", "Add"))
                    .onClick(async () => {
                        const newConfig = {
                            enabled: true,
                            selector: "",
                            note: "",
                            pageRangeType: PageRangeType.All,
                            customRange: undefined
                        };
                        await setPluginSetting("translationPages", [...translationPages, newConfig]);
                    });
            });

        // 显示现有的页面配置
        translationPages.forEach((page, index) => {
            const pageCard = containerEl.createDiv({ cls: "page-config-card" });

            // 卡片头部
            const cardHeader = pageCard.createDiv({ cls: "page-config-header" });

            // 折叠/展开按钮（第一个）
            const toggleBtn = cardHeader.createEl("span", { cls: "page-config-toggle" });
            toggleBtn.textContent = collapseStates[index] ? "▲" : "▼";
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                collapseStates[index] = !collapseStates[index];
                containerEl.empty();
                FunctionalArea.display(containerEl, translate, options);
            };

            // 开关
            new Setting(cardHeader)
                .setName("")
                .setDesc("")
                .addToggle((toggle) =>
                    toggle
                        .setValue(page.enabled)
                        .onChange(async (value) => {
                            const newPages = [...translationPages];
                            newPages[index] = { ...page, enabled: value };
                            await setPluginSetting("translationPages", newPages);
                        })
                );

            // 删除按钮
            const deleteBtn = cardHeader.createEl("button", { text: translate("delete", "Delete") });
            deleteBtn.classList.add("mod-danger", "page-config-delete");
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const newPages = translationPages.filter((_, i) => i !== index);
                collapseStates.splice(index, 1);
                await setPluginSetting("translationPages", newPages);
            };

            // 标题
            const title = cardHeader.createEl("span", { text: `${translate("page_config", "Page Configuration")} ${index + 1}` });
            title.classList.add("page-config-title");

            // 详细内容区
            if (collapseStates[index]) {
                const pageContainer = pageCard.createDiv({ cls: "page-config-body" });

                // 选择器输入
                new Setting(pageContainer)
                    .setName(translate("page_selector", "Page Selector"))
                    .setDesc(translate("page_selector_desc", "CSS selector for the page"))
                    .addText((text) =>
                        text
                            .setValue(page.selector)
                            .onChange(async (value) => {
                                const newPages = [...translationPages];
                                newPages[index] = { ...page, selector: value };
                                await setPluginSetting("translationPages", newPages);
                            })
                    );

                // 备注输入
                new Setting(pageContainer)
                    .setName(translate("page_note", "Note"))
                    .setDesc(translate("page_note_desc", "Add a note for this page configuration"))
                    .addText((text) =>
                        text
                            .setValue(page.note)
                            .onChange(async (value) => {
                                const newPages = [...translationPages];
                                newPages[index] = { ...page, note: value };
                                await setPluginSetting("translationPages", newPages);
                            })
                    );

                // 页面范围选择
                new Setting(pageContainer)
                    .setName(translate("page_range", "Page Range"))
                    .setDesc(translate("page_range_desc", "Select the range of pages to translate"))
                    .addDropdown((dropdown) => {
                        dropdown
                            .addOption(PageRangeType.First, translate("page_range_first", "First Page"))
                            .addOption(PageRangeType.All, translate("page_range_all", "All Pages"))
                            .addOption(PageRangeType.Custom, translate("page_range_custom", "Custom Range"))
                            .setValue(page.pageRangeType || PageRangeType.All)
                            .onChange(async (value) => {
                                const newPages = [...translationPages];
                                newPages[index] = {
                                    ...page,
                                    pageRangeType: value as PageRangeType,
                                    customRange: value === PageRangeType.Custom ? (page.customRange || { start: 1, end: 1 }) : undefined
                                };
                                await setPluginSetting("translationPages", newPages);
                            });
                    });

                // 自定义范围输入（当选择自定义范围时显示）
                if (page.pageRangeType === PageRangeType.Custom) {
                    const rangeContainer = pageContainer.createDiv("page-range-container");
                    rangeContainer.createEl("p", {
                        text: translate("page_range_custom_desc", "请输入要翻译的页面范围，例如：1-5 表示翻译第1页到第5页"),
                        cls: "setting-item-description"
                    });
                    new Setting(rangeContainer)
                        .setName(translate("page_range_start", "Start Page"))
                        .setDesc(translate("page_range_start_desc", "起始页码（从1开始）"))
                        .addText((text) => {
                            text
                                .setValue(page.customRange?.start.toString() || "1")
                                .setPlaceholder("1")
                                .onChange(async (value) => {
                                    const start = parseInt(value) || 1;
                                    const end = page.customRange?.end || 1;
                                    const validStart = Math.min(start, end);
                                    const newPages = [...translationPages];
                                    newPages[index] = {
                                        ...page,
                                        customRange: {
                                            start: validStart,
                                            end: end
                                        }
                                    };
                                    await setPluginSetting("translationPages", newPages);
                                });
                        });
                    new Setting(rangeContainer)
                        .setName(translate("page_range_end", "End Page"))
                        .setDesc(translate("page_range_end_desc", "结束页码（必须大于等于起始页码）"))
                        .addText((text) => {
                            text
                                .setValue(page.customRange?.end.toString() || "1")
                                .setPlaceholder("1")
                                .onChange(async (value) => {
                                    const start = page.customRange?.start || 1;
                                    const end = parseInt(value) || 1;
                                    const validEnd = Math.max(end, start);
                                    const newPages = [...translationPages];
                                    newPages[index] = {
                                        ...page,
                                        customRange: {
                                            start: start,
                                            end: validEnd
                                        }
                                    };
                                    await setPluginSetting("translationPages", newPages);
                                });
                        });
                }
            }
        });

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