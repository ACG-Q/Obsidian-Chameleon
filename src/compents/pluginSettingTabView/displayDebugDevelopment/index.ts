/**
 * 开发模式才能显示的页面配置
 */

import {Setting} from "obsidian";
import {translateType} from "src/interface";

const displayDebugDevelopment = (containerEl: HTMLElement, translate: translateType, opt: {
	openPluginFolder: () => Promise<void>
	resetPlugin: () => Promise<void>
	isDebug: boolean;
	toggleDebug: (toggle: boolean) => Promise<void>;
}) => {
	const {openPluginFolder, resetPlugin, isDebug, toggleDebug} = opt
	containerEl.createEl("h3", {text: translate("debug_development", "Debug Development")});

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
				.onClick(resetPlugin);
		});


	// 打开插件目录
	new Setting(containerEl)
		.setName(translate("open_plugin_directory", "Open Plugin Directory"))
		.setDesc(translate("open_plugin_directory_desc", "Open the plugin directory in the file manager"))
		.addButton((btn) => {
			btn
				.setClass("mod-cta")
				.setButtonText(translate("open", "Open"))
				.onClick(openPluginFolder)
		});


	// 启用调试
	new Setting(containerEl)
		.setName(translate("enable_debug", "Enable Debug"))
		.setDesc(translate("enable_debug_desc", "Enable debug mode to see more information in the console"))
		.addToggle((toggle) => {
			toggle
				.setValue(isDebug)
				.onChange(toggleDebug)
		})
}


export default displayDebugDevelopment;
