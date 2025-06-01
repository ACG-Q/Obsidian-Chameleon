/**
 * 文本处理模块
 * 负责文本替换和处理
 */

import { Dictionary, IPluginSettings } from "../interfaces";
import { MASK, MASK_ATTRIBUTE, ELEMENTS_TO_CAPTURE } from "../constants";
import { ErrorHandler } from "../utils/error-handler";
import { detectLanguages, getPrimaryLanguage } from "../utils/lang-detect";

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
                    // 使用语言检测工具分析文本
                    const langStats = detectLanguages(originalText, {
                        minPercentage: 10,    // 只考虑占比超过10%的语言
                        minChars: 2,          // 至少2个字符
                        ignoreWhitespace: true // 忽略空白字符
                    });

                    // 如果文本主要不是目标语言，则记录为未翻译
                    const primaryLang = getPrimaryLanguage(originalText);
                    if (primaryLang.language !== language && primaryLang.percentage >= 50) {
                        if (settings.recordUntranslated && !untranslatedTexts.includes(originalText)) {
                            debug(`[Chameleon] 找到未翻译的字符串: ${originalText} (检测到主要语言: ${primaryLang.language}, 占比: ${primaryLang.percentage.toFixed(1)}%)`);
                            untranslatedTexts.push(originalText);
                        }
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
    const initialUntranslatedCount = untranslatedTexts.length;
    for (const capture of ELEMENTS_TO_CAPTURE) {
        const containers = document.querySelectorAll(capture);
        containers.forEach(container => {
            translateElementText(container);
        });
    }
    // 计算新增的未翻译文本数量
    untranslatedCount = untranslatedTexts.length - initialUntranslatedCount;

    // 更新状态栏
    updateStatusBar(untranslatedCount.toString());
}