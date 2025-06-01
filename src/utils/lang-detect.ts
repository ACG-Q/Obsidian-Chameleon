// 语言检测工具
// 支持的语言：
// - 中文(zh)
// - 英文(en)
// - 日文(ja)
// - 韩文(ko)
// - 俄文(ru)
// - 阿拉伯文(ar)
// - 泰文(th)
// - 越南文(vi)
// - 其他(other)

export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'ru' | 'ar' | 'th' | 'vi' | 'other';

interface LanguageStats {
    language: Language;
    count: number;
    percentage: number;
}

interface LanguageDetectionOptions {
    minPercentage?: number;      // 最小百分比阈值，低于此值的语言将被忽略
    minChars?: number;           // 最小字符数阈值，低于此值的语言将被忽略
    combineOther?: boolean;      // 是否将其他语言合并为一个类别
    ignoreWhitespace?: boolean;  // 是否忽略空白字符
}

// Unicode 范围参考：
// 中文：\u4e00-\u9fa5
// 日文：\u3040-\u30ff\u31f0-\u31ff\uFF66-\uFF9F
// 韩文：\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF
// 俄文：\u0400-\u04FF
// 阿拉伯文：\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF
// 泰文：\u0E00-\u0E7F
// 越南文：\u1E00-\u1EFF\u00C0-\u00FF

const LANGUAGE_PATTERNS = new Map<Language, RegExp>([
    ['zh', /[\u4e00-\u9fa5]/],
    ['en', /[A-Za-z0-9\s.,!?;:'"()\[\]{}<>@#$%^&*_+=\-`~|\\/]/],
    ['ja', /[\u3040-\u30ff\u31f0-\u31ff\uFF66-\uFF9F]/],
    ['ko', /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/],
    ['ru', /[\u0400-\u04FF]/],
    ['ar', /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/],
    ['th', /[\u0E00-\u0E7F]/],
    ['vi', /[\u1E00-\u1EFF\u00C0-\u00FF]/],
    ['other', /./] // 匹配任何字符，作为默认选项
]);

// 默认配置
const DEFAULT_OPTIONS: LanguageDetectionOptions = {
    minPercentage: 5,    // 默认忽略占比低于5%的语言
    minChars: 2,         // 默认忽略字符数少于2的语言
    combineOther: true,  // 默认合并其他语言
    ignoreWhitespace: true // 默认忽略空白字符
};

/**
 * 检测文本中的语言分布
 * @param str 要检测的文本
 * @param options 检测选项
 * @returns 语言统计信息数组
 */
export function detectLanguages(
    str: string,
    options: LanguageDetectionOptions = {}
): LanguageStats[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // 初始化统计对象
    const stats: LanguageStats[] = Array.from(LANGUAGE_PATTERNS.keys()).map(lang => ({
        language: lang,
        count: 0,
        percentage: 0
    }));
    
    let totalChars = 0;
    
    // 统计各语言字符数量
    for (const char of str) {
        // 如果忽略空白字符且当前字符是空白，则跳过
        if (opts.ignoreWhitespace && /\s/.test(char)) {
            continue;
        }
        
        totalChars++;
        
        // 遍历所有语言模式，找到第一个匹配的
        for (const [lang, pattern] of LANGUAGE_PATTERNS) {
            if (pattern.test(char)) {
                const stat = stats.find(s => s.language === lang);
                if (stat) {
                    stat.count++;
                }
                break;
            }
        }
    }
    
    // 计算百分比
    stats.forEach(stat => {
        stat.percentage = totalChars > 0 ? (stat.count / totalChars) * 100 : 0;
    });
    
    // 应用过滤条件
    let filteredStats = stats.filter(stat => 
        stat.percentage >= (opts.minPercentage || 0) &&
        stat.count >= (opts.minChars || 0)
    );
    
    // 如果需要合并其他语言
    if (opts.combineOther) {
        const otherStats = filteredStats.filter(stat => stat.language === 'other');
        if (otherStats.length > 0) {
            const otherCount = otherStats.reduce((sum, stat) => sum + stat.count, 0);
            const otherPercentage = otherStats.reduce((sum, stat) => sum + stat.percentage, 0);
            
            filteredStats = filteredStats.filter(stat => stat.language !== 'other');
            filteredStats.push({
                language: 'other',
                count: otherCount,
                percentage: otherPercentage
            });
        }
    }
    
    // 按占比排序
    return filteredStats.sort((a, b) => b.percentage - a.percentage);
}

/**
 * 检测文本的主要语言
 * @param str 要检测的文本
 * @param options 检测选项
 * @returns 主要语言及其占比
 */
export function getPrimaryLanguage(
    str: string,
    options: LanguageDetectionOptions = {}
): { language: Language; percentage: number } {
    const stats = detectLanguages(str, options);
    return {
        language: stats[0]?.language || 'other',
        percentage: stats[0]?.percentage || 0
    };
}

/**
 * 检查文本是否主要使用指定语言
 * @param str 要检测的文本
 * @param language 目标语言
 * @param threshold 阈值（默认50%）
 * @returns 是否主要使用指定语言
 */
export function isPrimaryLanguage(
    str: string,
    language: Language,
    threshold: number = 50
): boolean {
    const primary = getPrimaryLanguage(str);
    return primary.language === language && primary.percentage >= threshold;
}

/**
 * 获取文本中所有检测到的语言
 * @param str 要检测的文本
 * @param options 检测选项
 * @returns 检测到的语言数组
 */
export function getDetectedLanguages(
    str: string,
    options: LanguageDetectionOptions = {}
): Language[] {
    return detectLanguages(str, options)
        .filter(stat => stat.percentage > 0)
        .map(stat => stat.language);
} 