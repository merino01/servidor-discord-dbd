import { BotClient } from "./bot-client"

/**
 * Singleton del cliente del bot
 * Permite acceder al bot desde cualquier parte de la aplicación
 */
class BotInstance {
	private static instance: BotClient | null = null

	/**
	 * Establece la instancia del bot
	 */
	static set (client: BotClient): void {
		if (this.instance) {
			throw new Error("Bot instance already set")
		}
		this.instance = client
	}

	/**
	 * Obtiene la instancia del bot
	 * @throws Error si el bot no ha sido inicializado
	 */
	static get (): BotClient {
		if (!this.instance) {
			throw new Error("Bot instance not initialized. Call BotInstance.set() first")
		}
		return this.instance
	}

	/**
	 * Verifica si el bot está inicializado
	 */
	static isInitialized (): boolean {
		return this.instance !== null
	}

	/**
	 * Obtiene la instancia del bot o null si no está inicializada
	 */
	static getOrNull (): BotClient | null {
		return this.instance
	}
}

export { BotInstance }
