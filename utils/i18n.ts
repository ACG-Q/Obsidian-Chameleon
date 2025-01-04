// 创建i18n.ts文件，用于配置国际化


interface IParams {
    id: string;
    defaultMessage: string;
    values?: Record<string, string>;
}

class i18n {
    private translation: { [key: string]: { [key: string]: string } };
    private defaultLang: string;

    /**
     * @param {object} locales 翻译文件, 请先导入import locales from "locales/resources.json";
     * @param {string} defaultLang 默认语言
     */
    constructor(locales: { [key: string]: { [key: string]: string } }, defaultLang: string) {
        this.translation = locales;
        this.defaultLang = defaultLang;
    }

    /**
     * @param {string} key 翻译key
     * @param {string} defaultValue 默认值
     * @param {object} params 参数对象
     * @param {string} lang 语言
     */
    translate(key: string, defaultValue: string, params: Record<string, string> = {}, lang: string = this.defaultLang): string {
        let translationString = defaultValue;
        if (this.translation.hasOwnProperty(lang) && this.translation[lang].hasOwnProperty(key)) {
            translationString = this.translation[lang][key];
        }

        // 替换参数
        for (const [paramKey, paramValue] of Object.entries(params)) {
            translationString = translationString.replace(new RegExp(`\{${paramKey}\}`, 'g'), paramValue);
        }

        return translationString;
    }

    /**
     * 定义一个formatMessage方法，用于格式化翻译信息
     * 
     * @param {IParams} param0 
     * @returns 
     */
    formatMessage({ id, defaultMessage, values }: IParams): string {
        return this.translate(id, defaultMessage, values);
    }
}

export default i18n;
