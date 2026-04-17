import { RedisClient, RedisQueue, QueueMessage } from "@org/redis"
import { botLogger } from "@/core/logger"
import { BotInstance } from "@/core/bot-instance"
import { getConfig } from "@/core/config"
import { ClanService } from "@/modules/clanes/services/clan.service"
import { sendDm } from "./send-dm"

const workerLogger = botLogger.child("redis-worker")

// ── Tipos ─────────────────────────────────────────────────────────────────────

type BotTask = QueueMessage[RedisQueue.BOT_TASKS]
type BotTaskHandler<T extends BotTask> = (task: T) => Promise<void>
type BotTaskHandlerMap = { [T in BotTask as T["type"]]: BotTaskHandler<T> }

// ── Handlers de BOT_TASKS ─────────────────────────────────────────────────────

async function handleSendMessage (task: Extract<BotTask, { type: "send_message" }>): Promise<void> {
	const bot = BotInstance.get()
	const channel = bot.channels.cache.get(task.channelId)
	if (!channel?.isTextBased() || channel.isDMBased()) {
		workerLogger.warn("send_message: canal no encontrado o no válido", { channelId: task.channelId })
		return
	}
	await channel.send(task.content)
}

async function handleCreateClan (task: Extract<BotTask, { type: "create_clan" }>): Promise<void> {
	const config = getConfig()
	const clanService = ClanService.getInstance()
	await clanService.createClan({
		name: task.name,
		guildId: task.guildId ?? config.discord.guildId,
		createdBy: task.createdBy,
		icon: task.icon,
		leaderId: task.leaderId
	})
	workerLogger.info("Clan creado desde el dashboard", { name: task.name })
}

async function handleSendDm (task: Extract<BotTask, { type: "send_dm" }>): Promise<void> {
	await sendDm(task.userId, { content: task.content })
	workerLogger.info("DM enviado desde el dashboard", { userId: task.userId })
}

const botTaskHandlers: BotTaskHandlerMap = {
	send_message: handleSendMessage,
	create_clan: handleCreateClan,
	send_dm: handleSendDm
}

// ── Queue runners ─────────────────────────────────────────────────────────────

type QueueHandler<Q extends RedisQueue> = (task: QueueMessage[Q]) => Promise<void>

const queueHandlers: { [Q in RedisQueue]: QueueHandler<Q> } = {
	[RedisQueue.BOT_TASKS]: async (task) => {
		const handler = botTaskHandlers[task.type] as (task: BotTask) => Promise<void>
		await handler(task)
	}
}

async function runQueueLoop (redis: RedisClient, queue: RedisQueue): Promise<void> {
	workerLogger.info(`Worker iniciado, escuchando cola: ${queue}`)

	while (true) {
		try {
			const task = await redis.dequeueBlocking(queue)
			if (task === null) { continue }

			workerLogger.debug("Tarea recibida", { queue, type: (task as { type: string }).type })
			await queueHandlers[queue](task)
		} catch (error) {
			workerLogger.error("Error procesando tarea de la cola", { queue, error })
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}
}

export async function startRedisWorker (): Promise<void> {
	const redis = await RedisClient.create()

	for (const queue of Object.values(RedisQueue)) {
		void runQueueLoop(redis, queue as RedisQueue)
	}
}

