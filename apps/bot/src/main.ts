import { startBot } from "./bootstrap"
import { logger } from "@org/logger"

async function main () {
	logger.info("Iniciando bot de Discord")

	try {
		await startBot()
		logger.info("Bot iniciado correctamente")
	} catch (error) {
		if (error instanceof Error) {
			logger.error("Error iniciando el bot: ", error.message)
			process.exit(1)
		}
	}
}

main()
