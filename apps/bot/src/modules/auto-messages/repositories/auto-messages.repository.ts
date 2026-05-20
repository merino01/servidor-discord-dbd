import { CronJob } from "cron"
import { AutoMessageModel, IAutoMessage, AutoMessageTargetType } from "@org/mongo"
import { BotInstance } from "@/core/bot-instance"
import { botLogger } from "@/core/logger"
import { TextChannel, ChannelType } from "discord.js"
import { replaceVariables, replaceVariablesInEmbed } from "../allowed-variables"

const autoMessageLogger = botLogger.child("auto-messages")

export class AutoMessageRepository {
	private jobs: Map<string, CronJob> = new Map()
	private static instance: AutoMessageRepository

	private constructor () {
		//
	}

	static getInstance (): AutoMessageRepository {
		if (!AutoMessageRepository.instance) {
			AutoMessageRepository.instance = new AutoMessageRepository()
		}
		return AutoMessageRepository.instance
	}

	async initialize (): Promise<void> {
		autoMessageLogger.info("Inicializando servicio de mensajes automáticos...")
		const activeMessages = await AutoMessageModel.find({ isActive: true })

		for (const message of activeMessages) {
			this.scheduleJob(message)
		}

		autoMessageLogger.info(`${activeMessages.length} mensajes automáticos programados`)
	}

	scheduleJob (autoMessage: IAutoMessage): void {
		const jobId = autoMessage._id.toString()

		if (this.jobs.has(jobId)) {
			this.cancelJob(jobId)
		}

		if (!autoMessage.cronExpression) {
			return
		}

		try {
			const job = new CronJob(
				autoMessage.cronExpression,
				async () => await this.executeJob(autoMessage),
				null,
				true,
				"Europe/Madrid"
			)

			this.jobs.set(jobId, job)
			autoMessageLogger.info(`Job programado: ${autoMessage.name} (${autoMessage.cronExpression})`)
		} catch (error) {
			autoMessageLogger.error(`Error al programar job ${autoMessage.name}:`, error)
		}
	}

	private async executeJob (autoMessage: IAutoMessage): Promise<void> {
		const client = BotInstance.get()
		if (!client) {
			autoMessageLogger.error("Cliente de Discord no disponible")
			return
		}

		try {
			const channels = await this.getTargetChannels(autoMessage)

			for (const channel of channels) {
				if (channel.type === ChannelType.GuildText) {
					const textChannel = channel as TextChannel
					const guild = textChannel.guild

					// Reemplazar variables en el mensaje
					const message = autoMessage.message
						? replaceVariables(autoMessage.message, { channel: textChannel, guild })
						: ""

					// Reemplazar variables en el embed
					const embeds = autoMessage.embed
						? [replaceVariablesInEmbed(autoMessage.embed, { channel: textChannel, guild })]
						: []

					await textChannel.send({
						content: message,
						embeds
					})
					autoMessageLogger.info(`Mensaje enviado a #${channel.name} (${autoMessage.name})`)
				}
			}

			await AutoMessageModel.findByIdAndUpdate(autoMessage._id, {
				lastExecutionAt: new Date(),
				$inc: { executionCount: 1 }
			})
		} catch (error) {
			autoMessageLogger.error(`Error ejecutando job ${autoMessage.name}:`, error)
		}
	}

	private async getTargetChannels (autoMessage: IAutoMessage) {
		const client = BotInstance.get()
		if (!client) {return []}

		const guild = client.guilds.cache.get(autoMessage.guildId)
		if (!guild) {return []}

		if (autoMessage.targetType === AutoMessageTargetType.CHANNEL) {
			const channel = guild.channels.cache.get(autoMessage.targetId)
			return channel ? [channel] : []
		}

		if (autoMessage.targetType === AutoMessageTargetType.CATEGORY) {
			return Array.from(guild.channels.cache.values()).filter(
				(ch) => ch.parentId === autoMessage.targetId && ch.type === ChannelType.GuildText
			)
		}

		return []
	}

	cancelJob (jobId: string): void {
		const job = this.jobs.get(jobId)
		if (job) {
			job.stop()
			this.jobs.delete(jobId)
			autoMessageLogger.info(`Job cancelado: ${jobId}`)
		}
	}

	async reload (): Promise<void> {
		autoMessageLogger.info("Recargando mensajes automáticos...")

		for (const [jobId, job] of this.jobs.entries()) {
			job.stop()
			this.jobs.delete(jobId)
		}

		await this.initialize()
	}

	getActiveJobs (): number {
		return this.jobs.size
	}
}
