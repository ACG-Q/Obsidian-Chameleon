/**
 * 增强版国际化工具类
 * 提供多语言翻译支持，支持参数替换、复数形式处理和日期格式化等高级特性
 */

import { ErrorHandler } from "./error-handler";

/**
 * 格式化消息参数接口
 */
export interface IFormatMessageParams {
    /** 翻译键 */
    id: string;
    /** 默认消息 */
    defaultMessage: string;
    /** 替换值 */
    values?: Record<string, string | number | Date>;
}

/**
 * 复数形式规则接口
 */
export interface IPluralRule {
    /** 复数形式条件函数 */
    condition: (n: number) => boolean;
    /** 复数形式文本模板 */
    template: string;
}

/**
 * 语言复数规则映射
 */
const PLURAL_RULES: Record<string, IPluralRule[]> = {
    // 英语复数规则
    "en": [
        { condition: (n) => n === 1, template: "one" },
        { condition: (n) => n !== 1, template: "other" }
    ],
    // 中文复数规则（中文通常不区分复数形式）
    "zh": [
        { condition: () => true, template: "other" }
    ],
    // 法语复数规则
    "fr": [
        { condition: (n) => n === 0 || n === 1, template: "one" },
        { condition: (n) => n > 1, template: "other" }
    ],
    // 俄语复数规则
    "ru": [
        { condition: (n) => n % 10 === 1 && n % 100 !== 11, template: "one" },
        { condition: (n) => [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100), template: "few" },
        { condition: (n) => n % 10 === 0 || [5, 6, 7, 8, 9].includes(n % 10) || [11, 12, 13, 14].includes(n % 100), template: "many" },
        { condition: () => true, template: "other" }
    ]
};

/**
 * 日期格式化选项接口
 */
export interface IDateFormatOptions {
    /** 日期格式 */
    format?: "short" | "medium" | "long" | "full";
    /** 是否包含时间 */
    includeTime?: boolean;
}

/**
 * 增强版i18n类型定义
 */
export type EnhancedI18nType = typeof EnhancedI18n;

/**
 * 增强版国际化工具类
 * 提供多语言翻译支持，支持参数替换、复数形式处理和日期格式化等高级特性
 */
class EnhancedI18n {
    private readonly translation: { [key: string]: { [key: string]: string } };
    private defaultLang: string;

    /**
     * 构造函数
     * @param {object} locales 翻译文件
     * @param {string} defaultLang 默认语言
     */
    constructor(locales: { [key: string]: { [key: string]: string } }, defaultLang: string) {
        this.translation = locales;
        this.defaultLang = defaultLang;
    }

    /**
     * 翻译方法
     * @param {string} key 翻译key
     * @param {string} defaultValue 默认值
     * @param {object} params 参数对象
     * @param {string} lang 语言
     * @returns {string} 翻译后的文本
     */
    translate(key: string, defaultValue: string, params: Record<string, string | number | Date> = {}, lang: string = this.defaultLang): string {
        let translationString = defaultValue;
        
        try {
            // 尝试获取翻译
            if (this.translation.hasOwnProperty(lang) && this.translation[lang].hasOwnProperty(key)) {
                translationString = this.translation[lang][key];
            } else if (this.defaultLang !== lang && this.translation.hasOwnProperty(this.defaultLang) && this.translation[this.defaultLang].hasOwnProperty(key)) {
                // 如果指定语言没有找到翻译，尝试使用默认语言
                translationString = this.translation[this.defaultLang][key];
            } else {
                ErrorHandler.warning(`翻译失败：${key}`, "", { key, defaultValue, lang });
            }

            // 处理参数替换
            translationString = this.processParams(translationString, params, lang);
            
            return translationString;
        } catch (error) {
            ErrorHandler.error("翻译处理异常", error as Error, { key, defaultValue, params, lang });
            return defaultValue;
        }
    }

    /**
     * 处理参数替换
     * @param text 文本模板
     * @param params 参数对象
     * @param lang 语言
     * @returns 替换后的文本
     */
    private processParams(text: string, params: Record<string, string | number | Date>, lang: string): string {
        let result = text;

        // 处理参数替换
        for (const [paramKey, paramValue] of Object.entries(params)) {
            // 处理日期类型参数
            if (paramValue instanceof Date) {
                const formattedDate = this.formatDate(paramValue, {}, lang);
                result = result.replace(new RegExp(`{${paramKey}}`, 'g'), formattedDate);
                continue;
            }

            // 处理复数形式
            if (typeof paramValue === 'number' && result.includes(`{${paramKey}, plural,`)) {
                result = this.processPluralForm(result, paramKey, paramValue, lang);
                continue;
            }

            // 普通参数替换
            result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        }

        return result;
    }

    /**
     * 处理复数形式
     * @param text 文本模板
     * @param paramKey 参数键
     * @param count 数量
     * @param lang 语言
     * @returns 处理后的文本
     */
    private processPluralForm(text: string, paramKey: string, count: number, lang: string): string {
        // 提取复数形式模板
        const pluralPattern = new RegExp(`{${paramKey}, plural, ([^}]+)}`, 'g');
        const match = pluralPattern.exec(text);
        
        if (!match) return text;
        
        const pluralForms = match[1].trim();
        const forms: Record<string, string> = {};
        
        // 解析复数形式模板
        pluralForms.split('|').forEach(form => {
            const [key, value] = form.trim().split('=').map(s => s.trim());
            forms[key] = value;
        });
        
        // 获取语言的复数规则
        const langCode = lang.split('-')[0];
        const rules = PLURAL_RULES[langCode] || PLURAL_RULES['en'];
        
        // 应用复数规则
        let selectedForm = 'other';
        for (const rule of rules) {
            if (rule.condition(count)) {
                selectedForm = rule.template;
                break;
            }
        }
        
        // 如果没有找到对应的复数形式，使用other或第一个可用的形式
        const replacement = forms[selectedForm] || forms['other'] || Object.values(forms)[0] || '';
        
        // 替换复数形式模板
        return text.replace(pluralPattern, replacement.replace(/#/g, String(count)));
    }

    /**
     * 格式化日期
     * @param date 日期对象
     * @param options 格式化选项
     * @param lang 语言
     * @returns 格式化后的日期字符串
     */
    formatDate(date: Date, options: IDateFormatOptions = {}, lang: string = this.defaultLang): string {
        const { format = 'medium', includeTime = true } = options;
        
        try {
            // 使用Intl.DateTimeFormat进行本地化日期格式化
            const dateStyle: Intl.DateTimeFormatOptions['dateStyle'] = format;
            const timeStyle: Intl.DateTimeFormatOptions['timeStyle'] = format === 'short' ? 'short' : 'medium';
            
            const dateTimeOptions: Intl.DateTimeFormatOptions = {
                dateStyle,
                ...(includeTime ? { timeStyle } : {})
            };
            
            return new Intl.DateTimeFormat(lang, dateTimeOptions).format(date);
        } catch (error) {
            ErrorHandler.warning("日期格式化失败", error as Error, { date, options, lang });
            
            // 回退到简单的日期格式化
            return date.toLocaleString(lang);
        }
    }

    /**
     * 格式化消息方法
     * 用于格式化翻译信息
     * @param {IFormatMessageParams} param0 格式化参数
     * @returns {string} 格式化后的文本
     */
    formatMessage({ id, defaultMessage, values }: IFormatMessageParams): string {
        return this.translate(id, defaultMessage, values);
    }

    /**
     * 设置默认语言
     * @param {string} lang 语言代码
     */
    setDefaultLang(lang: string): void {
        this.defaultLang = lang;
    }

    /**
     * 获取当前默认语言
     * @returns {string} 当前默认语言
     */
    getDefaultLang(): string {
        return this.defaultLang;
    }

    /**
     * 获取所有可用的语言
     * @returns {string[]} 可用语言列表
     */
    getAvailableLanguages(): string[] {
        return Object.keys(this.translation);
    }

    /**
     * 检查翻译键是否存在
     * @param key 翻译键
     * @param lang 语言
     * @returns 是否存在翻译
     */
    hasTranslation(key: string, lang: string = this.defaultLang): boolean {
        return this.translation.hasOwnProperty(lang) && this.translation[lang].hasOwnProperty(key);
    }
}

export default EnhancedI18n;