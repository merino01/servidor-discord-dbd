import { loadConfig } from "@core/config"
import { BotClient } from "@/core/bot-client"

// Importar todos los módulos y eventos
import "./events"
import "./modules/triggers"

// Cuando agregues más módulos con eventos, añádelos aquí:
// import './modules/otro-modulo/events';

export async function startBot () {
	const config = loadConfig()
	const client = new BotClient()
	await client.start(config.discord.token, config.discord.guildId)
	return client
}
