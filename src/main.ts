import {
	Debouncer,
	FileSystemAdapter,
	Notice,
	Plugin,
	debounce,
	getIcon,
} from "obsidian";
import i18n from "src/utils/i18n";
import locales from 'src/locales/i18n.json';
import { IPluginSettings, IPlugin } from "./interface";
import MyPluginSettingTab from "./compents/pluginSettingTabView";
import { franc } from "franc";
import convert3To1 from "src/utils/franc-plugins"


// 初始化默认设置
const DEFAULT_SETTINGS: IPluginSettings = {
	/**
	 * 翻译标识
	 */
	translationMark: {
		/**
		 * 是否显示翻译标识
		 */
		show: true,
		/**
		 * 翻译标识文本
		 */
		mark: "[👌]",
	},
	/**
	 * 自定义字典文件路径
	 */
	customDictionaryFile: "", // 字典文件路径
	/**
	 * 是否记录未翻译文本
	 */
	recordUntranslated: false,
	/**
	 * 是否开启实验性语言识别功能
	 */
	experimentalFrancRecognition: false,
	/**
	 * 是否启用调试打印
	 */
	isDebug: false
};

// 翻译文本标记
const MASK_ATTRIBUTE = "mask_attribute";
const MASK = "mask";

class Chameleon extends Plugin implements IPlugin {
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


	/**
	 * 插件加载时的初始化操作
	 */
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

		// 监听 DOM 更新
		this.observer = new MutationObserver(() => {
			this.replaceText();
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	/**
	 * 插件卸载时的操作
	 */
	onunload() {
		// 关闭监听
		if (this.observer) this.observer.disconnect();
	}

	/**
	 * 翻译方法
	 * @param key 翻译id
	 * @param defaultValue 没有找到对应的翻译时, 使用的默认翻译
	 * @param params 翻译参数
	 * @param lang 指定获取的翻译的语言
	 */
	translate(key: string, defaultValue: string, params?: Record<string, string>, lang?: string) {
		return this.i18n.translate(key, defaultValue, params, lang)
	}

	/**
	 * 替换文本方法
	 * @private
	 */
	private replaceText() {
		const translateElementText = (element:Element) => {
			// 遍历当前元素的所有子节点
			Array.from(element.childNodes).forEach(async (node) => {
				if (node.nodeType === Node.TEXT_NODE) {
					// 处理文本节点
					if (node.textContent === null || node.textContent.trim().length === 0) return; // 跳过空白文本
					const originalText = node.textContent.trim();
		
					const match = this.dictionary[originalText];
					if (match) {
						const { show, mark } = this.settings.translationMark;
						// 翻译并标记文本节点
						node.textContent = show ? mark + match : match;
						// 标记父级元素，表示该文本已被翻译
						element.setAttribute(MASK_ATTRIBUTE, MASK);
					} else {
						// 记录未翻译的文本
						if (
							this.settings.recordUntranslated &&
							!this.untranslatedTexts.includes(originalText)
						) {
							const langCode = franc(originalText, { minLength: originalText.length });
							const lang = convert3To1(langCode)
							if(this.settings.experimentalFrancRecognition) {
								if(lang !== this.language){
									this.debug(`[Chameleon] 语言不匹配: ${originalText} 当前字符串是 ${lang} 当前语言是 ${this.language}`)
									this.untranslatedTexts.push(originalText);
								}
							}else{
								this.debug(`[Chameleon] 找到未翻译的字符串: ${originalText}`)
								this.untranslatedTexts.push(originalText);
							}
						}
					}
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node as Element
					// 如果是子元素，递归处理
					if (
						!["HR", "BR"].includes(el.tagName) &&
						!el.getAttribute(MASK_ATTRIBUTE)
					) {
						translateElementText.call(this, node);
					}
				}
			});
		}

		// 需要捕获的元素
		const elements_to_capture: string[] = [
			// 弹窗
			".modal-content"
		];

		let untranslatedCount = 0;

		for (const capture of elements_to_capture) {
			const container = document.querySelector(capture);
			if (container) {
				translateElementText(container);
				untranslatedCount += this.untranslatedTexts.length;
			}
		}

		this.updateStatusBarByDebounce(untranslatedCount.toString());
	}

	/**
	 * 导出未翻译文本
	 */
	async exportUntranslatedText() {
		this.debug("[Chameleon] 开始导出未翻译文本")
		await this.exportUntranslatedTexts(this.untranslatedTexts);
		this.debug("[Chameleon] 导出未翻译文本完成")
	}

	/**
	 * 加载字典方法
	 * @param path 字典文件路径
	 * @param language 语言
	 * @private
	 */
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
		this.debug(`[Chameleon] 字典文件是否存在: ${isExists}(文件路径: ${path})`)
		if (!isExists) {
			// 通过相对于 Obsidian 标准目录的路径来查找文件， 发现不存在，那么尝试读取方法
			const arrayBuffer = await FileSystemAdapter.readLocalFile(path);
			try {
				const decoder = new TextDecoder("utf-8"); // 'utf-8' 是常见的字符编码，可以根据需要调整
				const content = decoder.decode(arrayBuffer);
				return getDictionary(content, language);
			} catch (e) {
				this.debug("[Chameleon] 字典文件读取失败: " + e)
				new Notice(this.i18n.translate("dictionary_not_found", "Dictionary file not found: {path}", { path }));
				return {};
			}
		} else {
			const content = await this.fs.read(path);
			return getDictionary(content, language);
		}
	}

	/**
	 * 导出未翻译文本方法
	 * @param texts 未翻译的文本
	 * @private
	 */
	private async exportUntranslatedTexts(texts: string[]) {
		const fs = this.app.vault.adapter as FileSystemAdapter;
		// 导出为翻译成 language 的文本
		const path = this.manifest.dir + `/untranslated-to-${this.language}.txt`;
		const isExists = await fs.exists(path);
		let content = {};
		try {
			content = isExists ? JSON.parse(await fs.read(path)) : {};
		} catch (e) { /* empty */ }

		for (const text of texts) {
			if (content.hasOwnProperty(text) || text.trim() === "") continue;
			content = { ...content, [text]: "" };
		}

		await fs.write(path, JSON.stringify(content, null, 2));
	}

	/**
	 * 更新状态栏方法
	 * @param count 数量
	 */
	updateStatusBar(count: string) {
		if(this.settings.recordUntranslated) {
			this.statusBarItem.setText(createFragment((f)=>{
				f.append(getIcon("languages") as never)
				f.createEl("span", { text: count, title: this.i18n.translate("untranslated_strings", "Untranslated strings: {count}", { count })})
			}))
		}else{
			this.statusBarItem.empty();
			this.untranslatedTexts = []
		}
	}

	/**
	 * 更新内置字典方法
	 */
	async updateDictionary() {
		// 从 https://github.com/ACG-Q/Obsidian-Chameleon-Dictionary 下载
		const DICTIONARY_URL = "https://raw.githubusercontent.com/ACG-Q/Obsidian-Chameleon-Dictionary/main/dictionary.json";

		try {
			// 从 GitHub 下载字典
			const response = await fetch(DICTIONARY_URL);
			if (!response.ok) {
				this.debug(`[Chameleon] 内置字典下载失败, 远程下载路径: ${DICTIONARY_URL}`)
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json(); // 直接解析 JSON 数据
			const jsonString = JSON.stringify(data); // 如果需要保存为字符串格式

			// 写入文件系统
			await this.fs.write(this.defaultDictionaryPath, jsonString);

			// 内置字典已更新
			new Notice(this.i18n.translate("builtin_dictionary_updated", "Built-in dictionary updated"));

			// 刷新翻译
			await this.reloadTranslation(this.dictionaryPath)
		} catch (error) {
			// 内置字典更新失败
			new Notice(this.i18n.translate("builtin_dictionary_update_failed", "Failed to update built-in dictionary") + ": " + error.message);
			console.error("内置字典更新失败:", error);
		}
	}

	/**
	 * 重新加载翻译方法
	 * @param file 文件路径
	 */
	async reloadTranslation(file: string) {
		this.dictionary = await this.loadDictionary(file, this.language);
	}

	private debug (...args: unknown[]) {
		if(this.settings.isDebug) console.log(...args)
	}


	/**
	 * 加载设置方法
	 */
	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	/**
	 * 保存设置方法
	 */
	async saveSettings() {
		this.saveDataByDebounce();
	}
}


export default Chameleon;
