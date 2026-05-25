import { startBot } from "./bootstrap"
import { botLogger } from "@core/logger"
import { reportBotError } from "@/modules/logs/services/error-reporter"
import type { BotClient } from "@/core/bot-client"

function registerProcessErrorHandlers (client: BotClient): void {
	process.on("unhandledRejection", async (reason) => {
		botLogger.error("Unhandled promise rejection:", reason)
		await reportBotError({
			error: reason,
			title: "Unhandled Promise Rejection",
			client
		})
	})

	process.on("uncaughtException", async (error) => {
		botLogger.error("Uncaught exception:", error)
		await reportBotError({
			error,
			title: "Uncaught Exception",
			client
		})
	})
}

async function main () {
	botLogger.info("Iniciando bot de Discord")

	try {
		const client = await startBot()
		registerProcessErrorHandlers(client)
		botLogger.info("Bot iniciado correctamente")
	} catch (error) {
		botLogger.error("Error iniciando el bot: ", error)
		await reportBotError({
			error,
			title: "Error iniciando el bot"
		})
		process.exit(1)
	}
}

main()
