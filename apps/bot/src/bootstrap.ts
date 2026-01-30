import { loadConfig } from "@core/config"
import { BotClient } from "@/core/bot-client"
import { BotInstance } from "@/core/bot-instance"
import { connectMongo } from "@org/mongo"

import "./events"

import "./modules/triggers"
import "./modules/logs"
import "./modules/channel-formats"
import "./modules/auto-messages"
import "./modules/stats"
import "./modules/echo"
import "./modules/clanes"
import "./modules/notificator"

export async function startBot () {
	const config = loadConfig()

	await connectMongo()

	const client = new BotClient()
	await client.start(config.discord.token, config.discord.guildId)

	// Registrar el bot en el singleton
	BotInstance.set(client)

	return client
}
