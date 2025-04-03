/**
 * 文本处理模块
 * 负责文本替换和处理
 */

import { Dictionary, IPluginSettings } from "../interfaces";
import { MASK, MASK_ATTRIBUTE, ELEMENTS_TO_CAPTURE } from "../constants";
import { ErrorHandler } from "../utils/error-handler";

/**
 * 替换文本方法
 * 遍历DOM元素，替换文本内容
 * 
 * @param dictionary 字典对象
 * @param settings 插件设置
 * @param language 当前语言
 * @param untranslatedTexts 未翻译文本数组
 * @param updateStatusBar 更新状态栏的回调函数
 * @param debug 调试输出函数
 */
export function replaceText(
    dictionary: Dictionary,
    settings: {
        translationMark: { show: boolean; mark: string },
        recordUntranslated: boolean
    },
    language: string,
    untranslatedTexts: string[],
    updateStatusBar: (count: string) => void,
    debug: (...args: unknown[]) => void
): void {
    // 调试输出
    debug("[Chameleon] 开始替换文本");
    
    // 翻译元素文本的函数
    const translateElementText = (element: Element) => {
        // 遍历当前元素的所有子节点
        Array.from(element.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                // 处理文本节点
                if (node.textContent === null || node.textContent.trim().length === 0) return; // 跳过空白文本
                const originalText = node.textContent.trim();

                const match = dictionary[originalText];
                if (match) {
                    const { show, mark } = settings.translationMark;
                    // 翻译并标记文本节点
                    node.textContent = show ? mark + match : match;
                    // 标记父级元素，表示该文本已被翻译
                    element.setAttribute(MASK_ATTRIBUTE, MASK);
                } else {
                    // 记录未翻译的文本
                    if (
                        settings.recordUntranslated &&
                        !untranslatedTexts.includes(originalText)
                    ) {
                        debug(`[Chameleon] 找到未翻译的字符串: ${originalText}`);
                        untranslatedTexts.push(originalText);
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                // 如果是子元素，递归处理
                if (
                    !["HR", "BR"].includes(el.tagName) &&
                    !el.getAttribute(MASK_ATTRIBUTE)
                ) {
                    translateElementText(node as Element);
                }
            }
        });
    };

    let untranslatedCount = 0;

    // 处理需要捕获的元素
    for (const capture of ELEMENTS_TO_CAPTURE) {
        const container = document.querySelector(capture);
        if (container) {
            translateElementText(container);
            untranslatedCount += untranslatedTexts.length;
        }
    }

    // 更新状态栏
    updateStatusBar(untranslatedCount.toString());
}