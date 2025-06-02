import { Modal, Setting, App, Notice } from "obsidian";
import { TranslateFunction } from "../../interfaces";

interface ExportOptions {
    format: "json" | "txt";
    selectedStrings: string[];
}

export class ExportModal extends Modal {
    private options: ExportOptions = {
        format: "json",
        selectedStrings: []
    };
    private onSubmit: (options: ExportOptions) => void;
    private translate: TranslateFunction;
    private untranslatedStrings: string[];

    constructor(app: App, translate: TranslateFunction, untranslatedStrings: string[], onSubmit: (options: ExportOptions) => void) {
        super(app);
        this.translate = translate;
        this.onSubmit = onSubmit;
        this.untranslatedStrings = untranslatedStrings;
        this.options.selectedStrings = [...untranslatedStrings];
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: this.translate("export_untranslated_text", "Export Untranslated Text") });

        // 格式选择
        new Setting(contentEl)
            .setName(this.translate("export_format", "Export Format"))
            .setDesc(this.translate("export_format_desc", "Choose the format for exported content"))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("json", "JSON")
                    .addOption("txt", "Text")
                    .setValue(this.options.format)
                    .onChange((value) => {
                        this.options.format = value as "json" | "txt";
                    });
            });

        // 未翻译字符串列表
        const listContainer = contentEl.createDiv("untranslated-strings-list");
        listContainer.createEl("h3", { text: this.translate("untranslated_strings", "Untranslated Strings", { count: this.untranslatedStrings.length.toString() }) });
        
        // 全选/取消全选按钮
        const selectAllContainer = listContainer.createDiv("select-all-container");
        const selectAllBtn = selectAllContainer.createEl("button", {
            text: this.translate("select_all", "Select All"),
            cls: "mod-cta"
        });
        selectAllBtn.onclick = () => {
            const checkboxes = listContainer.querySelectorAll("input[type='checkbox']") as NodeListOf<HTMLInputElement>;
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => {
                cb.checked = !allChecked;
                this.updateSelectedStrings(cb.value, !allChecked);
            });
            selectAllBtn.setText(allChecked ? this.translate("select_all", "Select All") : this.translate("deselect_all", "Deselect All"));
        };
        selectAllBtn.setText(this.translate("deselect_all", "Deselect All"));


        // 创建字符串列表
        this.untranslatedStrings.forEach((text) => {
            const itemContainer = listContainer.createDiv("untranslated-string-item");
            
            // label 包裹 checkbox 和内容
            const label = itemContainer.createEl("label", { cls: "untranslated-string-label" });
            label.style.display = "flex";
            label.style.alignItems = "flex-start";
            label.style.width = "100%";
            label.style.cursor = "pointer";
            label.style.gap = "0.8em";

            // 复选框
            const checkbox = label.createEl("input", {
                type: "checkbox",
                value: text
            });
            checkbox.checked = true;
            checkbox.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                this.updateSelectedStrings(target.value, target.checked);
                if (target.checked) {
                    itemContainer.addClass("selected");
                } else {
                    itemContainer.removeClass("selected");
                }
            };
            // 默认高亮
            itemContainer.addClass("selected");

            // 文本内容
            const textContainer = label.createDiv("untranslated-string-content");
            textContainer.createEl("div", { 
                text: text,
                cls: "untranslated-string-text"
            });
        });

        // 操作按钮
        const buttonContainer = contentEl.createDiv("modal-button-container");
        
        const cancelButton = buttonContainer.createEl("button", {
            text: this.translate("cancel", "Cancel"),
            cls: "mod-warning"
        });
        cancelButton.addEventListener("click", () => this.close());

        const exportButton = buttonContainer.createEl("button", {
            text: this.translate("export", "Export"),
            cls: "mod-cta"
        });
        exportButton.addEventListener("click", () => {
            if (this.options.selectedStrings.length === 0) {
                new Notice(this.translate("no_strings_selected", "Please select at least one string to export"));
                return;
            }
            this.onSubmit(this.options);
            this.close();
        });
    }

    private updateSelectedStrings(text: string, selected: boolean) {
        if (selected) {
            if (!this.options.selectedStrings.includes(text)) {
                this.options.selectedStrings.push(text);
            }
        } else {
            this.options.selectedStrings = this.options.selectedStrings.filter(s => s !== text);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 