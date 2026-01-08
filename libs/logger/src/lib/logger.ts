enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3
}

interface LoggerOptions {
	level?: LogLevel
	prefix?: string
}

class Logger {
	private level: LogLevel
	private prefix: string

	constructor (options: LoggerOptions = {}) {
		this.level = options.level ?? LogLevel.INFO
		this.prefix = options.prefix ?? ""
	}

	private formatMessage (level: string, color: string, ...args: unknown[]): void {
		const timestamp = new Date().toISOString()
		const prefix = this.prefix ? `[${this.prefix}] ` : ""
		console.log(`\x1b[90m${timestamp}\x1b[0m ${color}${level}\x1b[0m ${prefix}`, ...args)
	}

	debug (...args: unknown[]): void {
		if (this.level <= LogLevel.DEBUG) {
			this.formatMessage("DEBUG", "\x1b[36m", ...args)
		}
	}

	info (...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			this.formatMessage("INFO ", "\x1b[32m", ...args)
		}
	}

	warn (...args: unknown[]): void {
		if (this.level <= LogLevel.WARN) {
			this.formatMessage("WARN ", "\x1b[33m", ...args)
		}
	}

	error (...args: unknown[]): void {
		if (this.level <= LogLevel.ERROR) {
			this.formatMessage("ERROR", "\x1b[31m", ...args)
		}
	}

	setLevel (level: LogLevel): void {
		this.level = level
	}

	child (prefix: string): Logger {
		return new Logger({
			level: this.level,
			prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix
		})
	}
}

// Instancia global
const logger = new Logger()

export { Logger, LogLevel, logger }
