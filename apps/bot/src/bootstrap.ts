import { getConfig } from "@core/config"
import { BotClient } from "@/core/bot-client"
import { BotInstance } from "@/core/bot-instance"
import { connectMongo } from "@org/mongo"
import { bootstrapModules } from "@core/decorators/module.decorator"

import "./events"
import "~modules"

export async function startBot () {
	await connectMongo()
	await bootstrapModules()
	const config = getConfig()

	const client = new BotClient()
	await client.start(config.discord.token, config.discord.guildId)

	// Registrar el bot en el singleton
	BotInstance.set(client)

	return client
}
