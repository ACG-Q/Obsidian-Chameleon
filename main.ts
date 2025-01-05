import {
	App,
	Debouncer,
	FileSystemAdapter,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	debounce,
	getIcon,
	setIcon
} from "obsidian";
import i18n from "utils/i18n";
import locales from "locales/resources.json";

// 插件设置接口
interface MyPluginSettings {
	/**
	 * 翻译标识
	 */
	translationMark: {
		/**
		 * 是否显示翻译标识
		 */
		show: boolean;
		/**
		 * 翻译标识文本
		 */
		text: string;
	};
	/**
	 * 自定义字典文件路径
	 */
	customDictionaryFile: string;
	/**
	 * 是否记录未翻译文本
	 */
	recordUntranslated: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	translationMark: {
		show: true,
		text: "[👌]",
	},
	customDictionaryFile: "", // 字典文件路径
	recordUntranslated: false,
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	fs: FileSystemAdapter;
	language: string;
	private i18n: i18n;
	private untranslatedTexts: string[];
	private dictionary: Record<string, string>;
	private observer: MutationObserver;
	private statusBarItem: HTMLElement;
	private updateStatusBarByDebounce: Debouncer<[count: string], void>;

	async onload() {
		this.fs = this.app.vault.adapter as FileSystemAdapter;
		// 如果选择English的话，language没有值
		this.language = document.querySelector("html")?.getAttr("lang") || "";

		this.i18n = new i18n(locales, this.language);
		this.translate = this.translate.bind(this)

		// 未翻译文本
		this.untranslatedTexts = [];

		// 创建状态栏
		this.statusBarItem = this.addStatusBarItem();

		this.updateStatusBarByDebounce = debounce(this.updateStatusBar, 500)

		// 加载插件设置
		await this.loadSettings();

		// 添加设置面板
		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		// 获取字典内容
		const dictionaryPath = this.settings.customDictionaryFile || this.manifest.dir + "/dictionary.json";
		this.dictionary = await this.loadDictionary(dictionaryPath, this.language);

		// console.log("this.dictionary", this.dictionary);

		// 监听 DOM 更新
		this.observer = new MutationObserver(() => {
			this.replaceText();
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	onunload() {
		// 关闭监听
		if (this.observer) this.observer.disconnect();
	}

	translate(key: string, defaultValue: string, params?: Record<string, string>, lang?: string) {
		return this.i18n.translate(key, defaultValue, params, lang)
	}

	// 获取未翻译字符串的数量
	get untranslatedTextsCount() {
		return this.untranslatedTexts.length;
	}

	// 替换文本
	private replaceText() {
		const container = document.querySelector(".vertical-tab-content-container");
		if (!container) return;

		// 遍历所有子元素并替换文本
		container.querySelectorAll("*").forEach(async (element) => {
			if (element.childElementCount === 0 && element.textContent) {
				const originalText = element.textContent.trim();
				const match = this.dictionary[originalText];
				if (match) {
					const translationMark = this.settings.translationMark;
					// 添加翻译标识
					element.textContent = translationMark.show ? translationMark.text + match : match;
				} else {
					if (!this.settings.recordUntranslated || this.untranslatedTexts.includes(originalText)) return;
					this.untranslatedTexts.push(originalText);
				}
			}
		});

		// this.updateStatusBar();
		this.updateStatusBarByDebounce(this.untranslatedTexts.length.toString())
	}

	async exportUntranslatedText() {
		await this.exportUntranslatedTexts(this.untranslatedTexts);
	}

	// 加载字典
	private async loadDictionary(path: string, language: string): Promise<Record<string, string>> {
		const getDictionary = (content: string, language: string) => {
			const dictionaries = JSON.parse(content) as Record<string, Record<string, string>>;
			if (!dictionaries[language]) {
				new Notice(this.i18n.translate("no_corresponding_language", "No corresponding language in the dictionary file: {lang}", { lang: language }));
				return {};
			}
			new Notice(this.i18n.translate("dictionary_loaded", "Dictionary file loaded: {path}", { path }));
			return dictionaries[language];
		};

		const isExists = await this.fs.exists(path);
		if (!isExists) {
			// 通过相对于 Obsidian 标准目录的路径来查找文件， 发现不存在，那么尝试读取方法
			const arrayBuffer = await FileSystemAdapter.readLocalFile(path);
			try {
				const decoder = new TextDecoder("utf-8"); // 'utf-8' 是常见的字符编码，可以根据需要调整
				const content = decoder.decode(arrayBuffer);
				return getDictionary(content, language);
			} catch (e) {
				new Notice(this.i18n.translate("dictionary_not_found", "Dictionary file not found: {path}", { path }));
				return {};
			}
		} else {
			const content = await this.fs.read(path);
			return getDictionary(content, language);
		}
	}

	// 导出未翻译文本
	private async exportUntranslatedTexts(texts: string[]) {
		const fs = this.app.vault.adapter as FileSystemAdapter;
		// 导出为翻译成 language 的文本
		const path = this.manifest.dir + `/untranslated-to-${this.language}.txt`;
		const isExists = await fs.exists(path);
		var content = {};
		try {
			content = isExists ? JSON.parse(await fs.read(path)) : {};
		} catch (e) { }

		for (const text of texts) {
			if (content.hasOwnProperty(text) || text.trim() === "") continue;
			content = { ...content, [text]: "" };
		}

		await fs.write(path, JSON.stringify(content, null, 2));
	}

	updateStatusBar(count: string) {
		if(this.settings.recordUntranslated) {
			this.statusBarItem.setText(createFragment((f)=>{
				f.append(getIcon("languages") as any)
				f.createEl("span", { text: count, title: this.i18n.translate("untranslated_strings", "Untranslated strings: {count}", { count })})
			}))
			
		}else{
			this.statusBarItem.empty();
			this.untranslatedTexts = []
		}
	}

	// 重新加载翻译
	async reloadTranslation(file: string) {
		this.dictionary = await this.loadDictionary(file, this.language);
	}

	// 加载设置
	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	// 保存设置
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

interface ISettingTabElements {
	selectCustomDictionaryFileSetting?: Setting;
}

// 设置面板类
class MyPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
	elements: ISettingTabElements;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		// 清空设置面板内容
		containerEl.empty();

		// const i18nResourcePath = this.plugin.fs.getFullPath(this.plugin.manifest.dir + "/i18n/resources.json");
		// const translate = new i18n(i18nResourcePath, this.plugin.language).translate;

		const translate = this.plugin.translate;

		// 添加插件描述
		containerEl.createEl("h2", { text: translate("plugin_settings", "Plugin Settings") });
		containerEl.createEl("p", { text: translate("plugin_settings_desc", "Configure the plugin settings") });
		containerEl.createEl("p", { text: translate("current_language", "Translation identifier: {lang}", { lang: this.plugin.language }) });
		

		const copyToClipboard = (text: string) => {
			navigator.clipboard.writeText(text);
		};

		// 重启
		new Setting(containerEl)
			.setName(translate("restart_plugin", "Restart Plugin"))
			.setDesc(translate("restart_plugin_desc", "Restart the plugin to apply the new language"))
			.addButton((btn) => {
				btn
				.setButtonText(translate("restart", "Restart"))
				.onClick(() => {
					// 重启Obsidian
					window.location.reload();
				});
			});

		// 是否记录未翻译字符串
		new Setting(containerEl)
			.setName(translate("record_untranslated_strings", "Record Untranslated Strings"))
			.setDesc(translate("record_untranslated_strings_desc", "Whether to record untranslated strings to the list"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.recordUntranslated)
					.onChange(async (value) => {
						this.plugin.settings.recordUntranslated = value;
						this.plugin.updateStatusBar("0");
						await this.plugin.saveSettings();
					})
			);

		const createExportUntranslatedSettingsDescEleByUnexport = (fragment: DocumentFragment) => {};
	

		const createExportUntranslatedSettingsDescEleByExport = (fragment: DocumentFragment) => {
			fragment.createEl("span", {
				text: createFragment((f) => {
					f.createEl("span", { text: translate("untranslated_text_will_export_to", "Untranslated text will be exported to ") });
					f.createEl(
						"b", { text: this.plugin.manifest.dir + `/untranslated-to-${this.plugin.language}.txt`, title: translate("click_to_copy_to_clipboard", "Click to copy to clipboard") },
						(el) => {
							el.onclick = () => {
								copyToClipboard(this.plugin.fs.getFullPath(this.plugin.manifest.dir +`/untranslated-to-${this.plugin.language}.txt`));
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
				.onClick(() => {
					new Notice(translate("exporting", "Exporting... Please wait..."));
					this.plugin.exportUntranslatedText().then(() => {
						new Notice(translate("exported", "Untranslated text exported"));
						exportUntranslatedSettings.descEl.empty();
						exportUntranslatedSettings.setDesc(createFragment(createExportUntranslatedSettingsDescEleByExport));
					});
				});
			});

		// 添加翻译标识的开关
		new Setting(containerEl)
			.setName(translate("add_translation_mark", "Add Translation Mark"))
			.setDesc(translate("add_translation_mark_desc", "Whether to add a mark at the beginning of the translated text"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.translationMark.show)
					.onChange(async (value) => {
						this.plugin.settings.translationMark.show = value;
						await this.plugin.saveSettings();
					})
			);

		// 自定义翻译标识
		new Setting(containerEl)
			.setName(translate("translation_mark", "Translation Mark"))
			.setDesc(translate("translation_mark_desc", "Customize the mark for the translated text"))
			.addText((text) =>
				text
					.setValue(this.plugin.settings.translationMark.text)
					.onChange(async (value) => {
						this.plugin.settings.translationMark.text = value;
						await this.plugin.saveSettings();
					})
			);

		// 文件选择器
		const fileSelectorId = this.plugin.manifest.id + "-file-selector";
		const fileSelectorInputId = this.plugin.manifest.id + "-file-selector-input";
		const createFileSelector = (fragment: DocumentFragment) => {
			fragment.createEl("span", { text: translate("select_dictionary_file_path", "Select Dictionary File Path") });
			fragment.createEl("span", { text: translate("default_dictionary_path", "Specify a custom dictionary file path, the default path is dictionary.json in the plugin directory") });
			fragment.createEl("input", { type: "file" }, (el) => {
				el.accept = ".json";
				el.style.display = "none";
				el.id = fileSelectorId;
				el.onchange = async (e) => {
					const target = e.target as HTMLInputElement;
					if (!(target && target.files && target.files.length > 0)) return new Notice(translate("unselected_file", "No file selected"));
					const file = target.files[0];
					const path = (file as any).path;
					this.plugin.settings.customDictionaryFile = path;
					// 更新UI显示
					const fileSelectorInput = document.getElementById(fileSelectorInputId) as HTMLInputElement;
					if (fileSelectorInput) {
						fileSelectorInput.value = path;
					}
					// 更新字典内容
					await this.plugin.reloadTranslation(path);
					await this.plugin.saveSettings();
					new Notice(translate("dictionary_loaded", "Dictionary file loaded: {path}", { path }));
				};
			});
		};

		// 添加自定义字典文件路径设置
		new Setting(containerEl)
			.setName(translate("custom_dictionary_file", "Custom Dictionary File"))
			.setDesc(createFragment(createFileSelector))
			.addText((text) => {
				// 添加ID
				text.setValue(this.plugin.settings.customDictionaryFile).onChange(async (value) => {
					this.plugin.settings.customDictionaryFile = value;
					await this.plugin.saveSettings();
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
