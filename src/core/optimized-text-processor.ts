/**
 * 优化版文本处理器
 * 提供更高效的文本替换算法
 */

import { Dictionary, IPluginSettings } from "../interfaces";
import { MASK, MASK_ATTRIBUTE } from "../constants";
import { ErrorHandler } from "../utils/error-handler";

/**
 * 缓存结构，用于存储已处理过的文本
 */
interface TextCache {
    original: string;
    translated: string;
    timestamp: number;
}

// 文本缓存，用于避免重复处理相同的文本
const textCache = new Map<string, TextCache>();

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = 30 * 60 * 1000; // 30分钟

/**
 * 清理过期缓存
 */
function cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of textCache.entries()) {
        if (now - cache.timestamp > CACHE_EXPIRY) {
            textCache.delete(key);
        }
    }
}

/**
 * 优化版文本替换函数
 * 使用缓存和更高效的算法替换文本
 * 
 * @param dictionary 翻译字典
 * @param settings 插件设置
 * @param language 当前语言
 * @param untranslatedTexts 未翻译文本数组
 * @param updateStatusBar 更新状态栏的回调函数
 * @param debug 调试输出函数
 */
export function optimizedReplaceText(
    dictionary: Dictionary,
    settings: IPluginSettings,
    language: string,
    untranslatedTexts: string[],
    updateStatusBar: (count: string) => void,
    debug: (...args: unknown[]) => void
): void {
    try {
        // 定期清理过期缓存
        cleanExpiredCache();
        
        // 获取需要处理的元素
        const elements = document.querySelectorAll("[class*=\"view-content\"], [class*=\"view-header\"], [class*=\"status-bar\"], [class*=\"modal\"], [class*=\"menu\"], [class*=\"suggestion\"], [class*=\"tooltip\"], [class*=\"notice\"]");
        
        // 记录处理的元素数量
        let processedCount = 0;
        
        // 批量处理元素
        for (const element of Array.from(elements)) {
            // 跳过已处理的元素
            if (element.hasAttribute(MASK_ATTRIBUTE)) {
                continue;
            }
            
            // 标记元素为已处理
            element.setAttribute(MASK_ATTRIBUTE, MASK);
            
            // 处理元素内的文本节点
            processTextNodes(element, dictionary, settings, language, untranslatedTexts);
            
            processedCount++;
        }
        
        // 更新状态栏
        if (settings.recordUntranslated) {
            updateStatusBar(untranslatedTexts.length.toString());
        }
        
        debug(`[Chameleon] 已处理 ${processedCount} 个元素`);
    } catch (error) {
        ErrorHandler.error(
            "文本替换过程中发生错误",
            error as Error
        );
    }
}

/**
 * 处理元素内的文本节点
 * 
 * @param element 要处理的元素
 * @param dictionary 翻译字典
 * @param settings 插件设置
 * @param language 当前语言
 * @param untranslatedTexts 未翻译文本数组
 */
function processTextNodes(
    element: Element,
    dictionary: Dictionary,
    settings: IPluginSettings,
    language: string,
    untranslatedTexts: string[]
): void {
    // 使用TreeWalker高效遍历文本节点
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // 过滤掉空文本和只包含空白的文本
                const text = node.nodeValue?.trim();
                return text && text.length > 0
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    // 收集需要处理的文本节点
    const textNodes: Text[] = [];
    let currentNode: Node | null;
    
    while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode as Text);
    }
    
    // 批量处理文本节点
    for (const node of textNodes) {
        const originalText = node.nodeValue;
        if (!originalText || originalText.trim() === "") continue;
        
        // 检查缓存
        const cacheKey = `${language}:${originalText}`;
        const cachedResult = textCache.get(cacheKey);
        
        if (cachedResult && cachedResult.original === originalText) {
            // 使用缓存的翻译结果
            node.nodeValue = cachedResult.translated;
            continue;
        }
        
        // 翻译文本
        const translatedText = translateText(
            originalText,
            dictionary,
            settings,
            untranslatedTexts
        );
        
        // 更新节点文本
        if (translatedText !== originalText) {
            node.nodeValue = translatedText;
            
            // 缓存结果
            textCache.set(cacheKey, {
                original: originalText,
                translated: translatedText,
                timestamp: Date.now()
            });
        }
    }
}

/**
 * 翻译文本
 * 
 * @param text 原始文本
 * @param dictionary 翻译字典
 * @param settings 插件设置
 * @param untranslatedTexts 未翻译文本数组
 * @returns 翻译后的文本
 */
function translateText(
    text: string,
    dictionary: Dictionary,
    settings: IPluginSettings,
    untranslatedTexts: string[]
): string {
    // 如果字典中有完全匹配的条目，直接返回
    if (dictionary[text]) {
        return settings.translationMark.show
            ? `${dictionary[text]} ${settings.translationMark.mark}`
            : dictionary[text];
    }
    
    // 记录未翻译的文本
    if (settings.recordUntranslated && text.trim().length > 0) {
        if (!untranslatedTexts.includes(text)) {
            untranslatedTexts.push(text);
        }
    }
    
    return text;
}