import { RedisChannel, RedisClient } from "@org/redis"
import { getConfig } from "@core/config"
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
import "./modules/random-channel"
import "./modules/welcome-message"
import "./modules/claim"
import { ClanService } from "./modules/clanes/services/clan.service"
import { sendDm } from "./lib/send-dm"

export async function startBot () {
	await connectMongo()
	const config = getConfig()

	const client = new BotClient()
	await client.start(config.discord.token, config.discord.guildId)

	// Registrar el bot en el singleton
	BotInstance.set(client)

	// Suscribirse a los canales de redis
	subscribeRedis()

	return client
}

async function subscribeRedis () {
	const config = getConfig()
	const redis = new RedisClient()
	await redis.subscribe(RedisChannel.NOTIFY, async (msg) => {
		console.log("Mensaje recibido en Redis:", msg)
		try {
			const bot = BotInstance.get()
			if (!bot) {
				console.error("Bot no inicializado")
				return
			}

			const guild = bot.guilds.cache.get(config.discord.guildId)
			if (!guild) {
				console.error("Guild no encontrada")
				return
			}

			const clanService = new ClanService()
			await clanService.createClan({
				name: "test3 desde el dashboard",
				guildId: config.discord.guildId,
				createdBy: "merino-test",
				icon: "😉",
				leaderId: "328872376638898176"
			})

			await sendDm("328872376638898176", { content: "Mensaje desde el dashboard: 'Bobo'" })
		} catch (error) {
			console.error("Error al procesar mensaje de Redis:", (error as Error).message)
		}
	})
}
