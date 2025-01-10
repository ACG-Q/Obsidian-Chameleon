import {
	Debouncer,
	FileSystemAdapter,
	Notice,
	Plugin,
	debounce,
	getIcon,
} from "obsidian";
import i18n from "src/utils/i18n";
import locales from "src/locales/resources.json";
import { IPluginSettings, IPlugin } from "./interface";
import MyPluginSettingTab from "./compents/pluginSettingTabView";



const DEFAULT_SETTINGS: IPluginSettings = {
	translationMark: {
		show: true,
		mark: "[👌]",
	},
	customDictionaryFile: "", // 字典文件路径
	recordUntranslated: false,
};

// 翻译文本标记
const MASK_ATTRIBUTE = "mask_attribute";
const MASK = "mask";

export default class Chameleon extends Plugin implements IPlugin {
    settings: IPluginSettings;
    fs: FileSystemAdapter;
    language: string;
    /**
     * 该路径为normalizedPath
     */
    defaultDictionaryPath: string;
    dictionaryPath: string;

	private i18n: i18n;
	private untranslatedTexts: string[];
	private dictionary: Record<string, string>;
	private observer: MutationObserver;
	private statusBarItem: HTMLElement;
	private updateStatusBarByDebounce: Debouncer<[count: string], void>;	
    updateDictionaryByDebounce: Debouncer<[], void>
	saveDataByDebounce: Debouncer<[], Promise<void>>
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
		this.updateDictionaryByDebounce = debounce(this.updateDictionary, 500)
		this.saveDataByDebounce = debounce(async () => await this.saveData(this.settings), 1000)

		// 加载插件设置
		await this.loadSettings();

		// 添加设置面板
		this.addSettingTab(new MyPluginSettingTab(this.app, this));

		// 获取字典内容
		this.defaultDictionaryPath = this.manifest.dir + "/dictionary.json";
		this.dictionaryPath = this.settings.customDictionaryFile || this.defaultDictionaryPath;
		this.dictionary = await this.loadDictionary(this.dictionaryPath, this.language);

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
		// 设置界面的右边页面
		const container = document.querySelector(".vertical-tab-content-container>.vertical-tab-content");
		if (!container) return;

		// 遍历所有子元素并替换文本
		container.querySelectorAll("*").forEach(async (element) => {
			// 1. 获取元素是否为最后一个子元素
			// 2. 当前元素是否存在文本
			// 3. 当前元素是否没有被翻译
			if(element.childElementCount !== 0 || element.textContent === null || element.textContent.trim().length === 0 || element.getAttribute(MASK_ATTRIBUTE) === MASK) return;
			
			const originalText = element.textContent.trim();
			const match = this.dictionary[originalText];
			if (match) {
				const translationMark = this.settings.translationMark;
				// 添加翻译标识
				element.textContent = translationMark.show ? translationMark.mark + match : match;
				// 添加自定义属性，标识为翻译的文本
				element.setAttribute(MASK_ATTRIBUTE, MASK)
			} else {
				if (!this.settings.recordUntranslated || this.untranslatedTexts.includes(originalText)) return;
				this.untranslatedTexts.push(originalText);
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

	/**
	 * 更新内置字典
	 * 该函数从指定的URL下载字典数据，并将其写入到文件系统中
	 * 如果更新成功，将显示成功通知，如果更新失败，将显示错误通知
	 */
	async updateDictionary() {
		// 从 https://github.com/ACG-Q/Obsidian-Chameleon-Dictionary 下载
		const DICTIONARY_URL = "https://raw.githubusercontent.com/ACG-Q/Obsidian-Chameleon-Dictionary/main/dictionary.json";

		try {
			// 从 GitHub 下载字典
			const response = await fetch(DICTIONARY_URL);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json(); // 直接解析 JSON 数据
			const jsonString = JSON.stringify(data); // 如果需要保存为字符串格式

			// 写入文件系统
			await this.fs.write(this.defaultDictionaryPath, jsonString);

			// 内置字典已更新
			new Notice(this.i18n.translate("builtin_dictionary_updated", "Built-in dictionary updated"));

			// 刷新翻译
			this.reloadTranslation(this.dictionaryPath)
		} catch (error) {
			// 内置字典更新失败
			new Notice(this.i18n.translate("builtin_dictionary_update_failed", "Failed to update built-in dictionary") + ": " + error.message);
			console.error("内置字典更新失败:", error);
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
		await this.saveDataByDebounce();
		
	}
}