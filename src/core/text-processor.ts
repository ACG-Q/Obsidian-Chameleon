/**
 * 文本处理模块
 * 负责文本替换和处理
 */

import { MASK, MASK_ATTRIBUTE } from "src/constants";
import { Dictionary } from "../interfaces";
import { detectLanguages, getPrimaryLanguage } from "../utils/lang-detect";

// 需要捕获的元素
const ELEMENTS_TO_CAPTURE = [
    "div",
    "span",
    "p",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a",
    "button",
    "label",
    "li",
    "td",
    "th"
];

/**
 * 页面范围类型
 */
export enum PageRangeType {
    /**
     * 第一页
     */
    First = "first",
    /**
     * 所有页面
     */
    All = "all",
    /**
     * 自定义范围
     */
    Custom = "custom"
}

/**
 * 翻译页面配置
 */
interface TranslationPage {
    /**
     * 是否启用此页面配置
     */
    enabled: boolean;
    /**
     * 页面选择器
     */
    selector: string;
    /**
     * 备注说明
     */
    note: string;
    /**
     * 页面范围类型
     */
    pageRangeType: PageRangeType;
    /**
     * 自定义页面范围（当pageRangeType为custom时使用）
     */
    customRange?: {
        /**
         * 起始页码
         */
        start: number;
        /**
         * 结束页码
         */
        end: number;
    };
}

/**
 * 替换文本
 * @param dictionary 字典
 * @param settings 设置
 * @param language 目标语言
 * @param untranslatedTexts 未翻译文本数组
 * @param updateStatusBar 更新状态栏的回调函数
 * @param debug 调试输出函数
 */
export function replaceText(
    dictionary: Dictionary,
    settings: {
        translationMark: { show: boolean; mark: string },
        recordUntranslated: boolean,
        translationPages: TranslationPage[]
    },
    language: string,
    untranslatedTexts: string[],
    updateStatusBar: (count: string) => void,
    debug: (...args: unknown[]) => void
): void {
    // 调试输出
    debug(`[Chameleon] 开始处理文本，目标语言: ${language}`);

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
            }
        });
    };

    // 获取需要处理的根元素
    const getRootElements = () => {
        // 获取所有启用的页面配置
        const enabledPages = settings.translationPages.filter(page => page.enabled);
        if (enabledPages.length > 0) {
            // 如果启用了自定义页面配置，使用配置的选择器
            return enabledPages.flatMap(page => {
                const elements = Array.from(document.querySelectorAll(page.selector));
                
                // 根据页面范围类型过滤元素
                switch (page.pageRangeType) {
                    case PageRangeType.First:
                        return elements.slice(0, 1);
                    case PageRangeType.All:
                        return elements;
                    case PageRangeType.Custom:
                        if (page.customRange) {
                            const { start, end } = page.customRange;
                            return elements.slice(start - 1, end);
                        }
                        return elements;
                    default:
                        return elements;
                }
            });
        } else {
            // 否则使用默认的工作区内容
            return [document.querySelector(".workspace-leaf-content")];
        }
    };

    // 处理元素的函数
    const processElement = (element: Element) => {
        // 如果元素已经被翻译过，跳过
        if (element.hasAttribute(MASK_ATTRIBUTE)) {
            return;
        }

        // 检查元素是否应该被排除
        const isExcluded = settings.translationPages.some(page => 
            !page.enabled && (element.matches(page.selector) || element.closest(page.selector))
        );
        if (isExcluded) {
            return;
        }

        // 如果元素是需要捕获的类型，处理其文本
        if (ELEMENTS_TO_CAPTURE.includes(element.tagName.toLowerCase())) {
            translateElementText(element);
        }

        // 递归处理子元素
        Array.from(element.children).forEach(processElement);
    };

    // 处理所有根元素
    getRootElements().forEach(root => {
        if (root) {
            processElement(root);
        }
    });

    // 更新状态栏
    updateStatusBar(untranslatedTexts.length.toString());
}