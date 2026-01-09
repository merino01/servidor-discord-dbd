import { startBot } from "./bootstrap"
import { botLogger } from "@core/logger"

async function main () {
	botLogger.info("Iniciando bot de Discord")

	try {
		await startBot()
		botLogger.info("Bot iniciado correctamente")
	} catch (error) {
		if (error instanceof Error) {
			botLogger.error("Error iniciando el bot: ", error.message)
			process.exit(1)
		}
	}
}

main()
