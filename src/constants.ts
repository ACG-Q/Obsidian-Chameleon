/**
 * Obsidian-Chameleon 常量定义文件
 * 集中管理所有常量，消除硬编码字符串和魔法数字
 */

// 翻译文本标记相关常量
export const MASK_ATTRIBUTE = "mask_attribute";
export const MASK = "mask";

// 默认设置
export const DEFAULT_SETTINGS = {
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
     * 是否启用调试打印
     */
    isDebug: false
};

// 字典相关常量
export const DICTIONARY_URL = "https://raw.githubusercontent.com/ACG-Q/Obsidian-Chameleon-Dictionary/main/dictionary.json";

// DOM 选择器常量
export const ELEMENTS_TO_CAPTURE = [
    // 弹窗
    ".modal-content"
    // 可以根据需要添加更多选择器
];