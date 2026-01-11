import { loadConfig } from "@core/config"
import { BotClient } from "@/core/bot-client"
import { BotInstance } from "@/core/bot-instance"
import { connectMongo } from "@org/mongo"

// Importar todos los módulos y eventos
import "./events"
import "./modules/triggers"
import "./modules/triggers/components/trigger-select"
import "./modules/logs"

// Cuando agregues más módulos con eventos, añádelos aquí:
// import './modules/otro-modulo/events';

export async function startBot () {
	const config = loadConfig()

	await connectMongo()

	const client = new BotClient()
	await client.start(config.discord.token, config.discord.guildId)

	// Registrar el bot en el singleton
	BotInstance.set(client)

	return client
}
