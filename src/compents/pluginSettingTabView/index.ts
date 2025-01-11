import { App, normalizePath, Plugin, PluginManifest, PluginSettingTab, Setting } from "obsidian";
import { IPlugin, IPluginSettings } from "src/interface";
import displayDebugDevelopment from "./displayDebugDevelopment";
import displayFunctionalArea from "./displayFunctionalArea";

interface ISettingTabElements {
	selectCustomDictionaryFileSetting?: Setting;
}

// 设置面板类
class MyPluginSettingTab extends PluginSettingTab {
	plugin: Plugin & IPlugin;
	elements: ISettingTabElements;

	constructor(app: App, plugin: Plugin & IPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		// 清空设置面板内容
		containerEl.empty();

		const translate = this.plugin.translate;

		// 添加插件描述
		containerEl.createEl("h2", { text: translate("plugin_settings", "Plugin Settings") });
		containerEl.createEl("p", { text: translate("plugin_settings_desc", "Configure the plugin settings") + "--" + translate("current_language", "Translation identifier: {lang}", { lang: this.plugin.language }) });

		/**
		 * 获取设置值
		 * @param key 设置键名
		 * @returns 返回对应键名的设置值
		 */
		const getPluginSetting = <T extends keyof IPluginSettings>(key: T): IPluginSettings[T] => {
			if (!(key in this.plugin.settings)) {
				throw new Error(`Invalid settings key: ${key}`);
			}
			return this.plugin.settings[key];
		}

		/**
		 * 设置配置值并保存
		 * @param key 设置键名
		 * @param value 设置的新值
		 */
		const setPluginSetting = async <T extends keyof IPluginSettings>(key: T, value: IPluginSettings[T]) => {
			if (!(key in this.plugin.settings)) {
				throw new Error(`Invalid settings key: ${key}`);
			}
			try {
				this.plugin.settings[key] = value;
				await this.plugin.saveSettings();
			} catch (error) {
				console.error('Failed to save settings:', error);
			}
		}

		/**
		 * 获取插件清单中的特定信息
		 * @param key 清单中的键名
		 * @returns 返回对应键名的清单信息
		 */
		const getPluginManifest = <T extends keyof PluginManifest>(key: T): PluginManifest[T] => {
			return this.plugin.manifest[key]
		}

		/**
		 * 获取未翻译文本的文件路径
		 * @param full 是否返回完整路径，默认为false
		 * @returns 返回未翻译文本的路径
		 */
		const getUntranslatedFilePath = (full?: boolean) => {
			const pluginDir = getPluginManifest("dir")!;
			const normalizedPath = normalizePath(pluginDir + `/untranslated-to-${this.plugin.language}.txt`);
			return full ? this.plugin.fs.getFullPath(normalizedPath) : normalizedPath
		};

		/**
		 * 更新状态栏
		 * @param count 
		 */
		const updateStatus = (count: number) => {
			this.plugin.updateStatusBar(count.toString())
		}

		/**
		 * 导出未翻译文本
		 */
		const exportUntranslatedContent = async () => await this.plugin.exportUntranslatedText()

		/**
		 * 重新加载翻译
		 * @param path 翻译文件的路径
		 */
		const reloadTranslationFile = async (path: string) => await this.plugin.reloadTranslation(path)

		/**
		 * 更新字典
		 */
		const updateBuiltInDictionary = () => this.plugin.updateDictionaryByDebounce();

		/**
		 * 打开插件目录
		 */
		const openPluginFolder = async () => {
			(this.app as any).showInFolder(normalizePath(getPluginManifest("dir")! + "/main.js"));
		};

		const resetPlugin = async () => {
			const plugins = (this.app as any).plugins
			await plugins.disablePlugin(this.plugin.manifest.id);
			await plugins.enablePlugin(this.plugin.manifest.id);
		}


		displayDebugDevelopment(containerEl, translate, {
			openPluginFolder,
			resetPlugin
		});

		displayFunctionalArea(containerEl, translate, {
			pluginIdentifier: getPluginManifest("id"),
			getUntranslatedFilePath,
			getPluginSetting,
			setPluginSetting,
			updateStatus,
			exportUntranslatedContent,
			reloadTranslationFile,
			updateBuiltInDictionary
		})

	}
}

export default MyPluginSettingTab;