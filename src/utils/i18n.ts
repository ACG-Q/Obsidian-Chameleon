/**
 * 国际化工具类
 * 提供多语言翻译支持
 */

/**
 * 格式化消息参数接口
 */
interface IFormatMessageParams {
    id: string;
    defaultMessage: string;
    values?: Record<string, string>;
}

/**
 * i18n类型定义
 */
export type i18nType = typeof I18n;

/**
 * 国际化工具类
 * 提供多语言翻译支持，支持参数替换
 */
class I18n {
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
    translate(key: string, defaultValue: string, params: Record<string, string> = {}, lang: string = this.defaultLang): string {
        let translationString = defaultValue;
        
        // 尝试获取翻译
        if (this.translation.hasOwnProperty(lang) && this.translation[lang].hasOwnProperty(key)) {
            translationString = this.translation[lang][key];
        } else if (this.defaultLang !== lang && this.translation.hasOwnProperty(this.defaultLang) && this.translation[this.defaultLang].hasOwnProperty(key)) {
            // 如果指定语言没有找到翻译，尝试使用默认语言
            translationString = this.translation[this.defaultLang][key];
        } else {
            console.log(`[i18n] 翻译失败：${key}`);
        }

        // 替换参数
        for (const [paramKey, paramValue] of Object.entries(params)) {
            translationString = translationString.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
        }

        return translationString;
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
}

export default I18n;