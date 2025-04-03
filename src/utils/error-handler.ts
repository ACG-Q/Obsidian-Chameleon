/**
 * 错误处理工具类
 * 提供统一的错误处理和日志记录功能
 */

import { Notice } from "obsidian";

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    FATAL = "fatal"
}

/**
 * 错误处理选项接口
 */
export interface ErrorHandlerOptions {
    /** 是否显示通知 */
    showNotice?: boolean;
    /** 是否记录到控制台 */
    logToConsole?: boolean;
    /** 错误级别 */
    level?: ErrorLevel;
    /** 额外的上下文信息 */
    context?: Record<string, unknown>;
}

/**
 * 默认错误处理选项
 */
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
    showNotice: true,
    logToConsole: true,
    level: ErrorLevel.ERROR,
    context: {}
};

/**
 * 错误处理类
 * 提供统一的错误处理和日志记录功能
 */
export class ErrorHandler {
    private static isDebugMode = false;
    private static prefix = "[Chameleon]";

    /**
     * 设置调试模式
     * @param isDebug 是否启用调试模式
     */
    static setDebugMode(isDebug: boolean): void {
        this.isDebugMode = isDebug;
    }

    /**
     * 设置日志前缀
     * @param prefix 日志前缀
     */
    static setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    /**
     * 处理错误
     * @param error 错误对象或错误消息
     * @param message 友好的错误消息
     * @param options 错误处理选项
     */
    static handleError(error: Error | string, message: string, options?: Partial<ErrorHandlerOptions>): void {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const errorMessage = typeof error === "string" ? error : error.message;
        const fullMessage = `${message}: ${errorMessage}`;

        // 记录到控制台
        if (opts.logToConsole) {
            const logMethod = this.getLogMethod(opts.level!);
            logMethod(`${this.prefix} ${fullMessage}`);
            
            // 如果是Error对象且不是INFO级别，输出堆栈信息
            if (typeof error !== "string" && opts.level !== ErrorLevel.INFO) {
                console.error(error.stack);
            }
            
            // 输出上下文信息
            if (opts.context && Object.keys(opts.context).length > 0) {
                console.log(`${this.prefix} Context:`, opts.context);
            }
        }

        // 显示通知
        if (opts.showNotice) {
            new Notice(fullMessage);
        }
    }

    /**
     * 记录信息日志
     * @param message 日志消息
     * @param context 上下文信息
     */
    static info(message: string, context?: Record<string, unknown>): void {
        if (!this.isDebugMode) return;
        
        this.handleError("", message, {
            level: ErrorLevel.INFO,
            showNotice: false,
            context
        });
    }

    /**
     * 记录警告日志
     * @param message 警告消息
     * @param error 错误对象或错误消息
     * @param context 上下文信息
     */
    static warning(message: string, error?: Error | string, context?: Record<string, unknown>): void {
        this.handleError(error || "", message, {
            level: ErrorLevel.WARNING,
            showNotice: this.isDebugMode,
            context
        });
    }

    /**
     * 记录错误日志
     * @param message 错误消息
     * @param error 错误对象或错误消息
     * @param context 上下文信息
     */
    static error(message: string, error: Error | string, context?: Record<string, unknown>): void {
        this.handleError(error, message, {
            level: ErrorLevel.ERROR,
            context
        });
    }

    /**
     * 记录致命错误日志
     * @param message 错误消息
     * @param error 错误对象或错误消息
     * @param context 上下文信息
     */
    static fatal(message: string, error: Error | string, context?: Record<string, unknown>): void {
        this.handleError(error, message, {
            level: ErrorLevel.FATAL,
            context
        });
    }

    /**
     * 调试日志
     * 仅在调试模式下输出
     * @param args 日志参数
     */
    static debug(...args: unknown[]): void {
        if (!this.isDebugMode) return;
        console.log(this.prefix, ...args);
    }

    /**
     * 获取对应级别的日志方法
     * @param level 错误级别
     * @returns 日志方法
     */
    private static getLogMethod(level: ErrorLevel): (...args: any[]) => void {
        switch (level) {
            case ErrorLevel.INFO:
                return console.log;
            case ErrorLevel.WARNING:
                return console.warn;
            case ErrorLevel.ERROR:
            case ErrorLevel.FATAL:
                return console.error;
            default:
                return console.log;
        }
    }
}