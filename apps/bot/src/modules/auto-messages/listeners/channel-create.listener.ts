import { registerEvent } from "@/core/event-registry"
import { Events, ChannelType, GuildBasedChannel, TextChannel, AuditLogEvent, User } from "discord.js"
import { AutoMessageModel, AutoMessageTargetType } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { replaceVariables, replaceVariablesInEmbed } from "../allowed-variables"

const autoMessageLogger = botLogger.child("auto-messages")

export class ChannelCreateListener {
	async  getChannelCreator (channel: GuildBasedChannel): Promise<User | undefined> {
		try {
			const auditLogs = await channel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelCreate,
				limit: 1
			})
			const log = auditLogs.entries.first()
			if (log && log.target?.id === channel.id && log.executor) {
			// Si es un usuario parcial, intentar obtener el completo
				if (log.executor.partial) {
					return await log.executor.fetch()
				}
				return log.executor
			}
		} catch (error) {
			autoMessageLogger.warn("No se pudo obtener el creador del canal desde audit logs:", error)
		}
		return undefined
	}

	async  sendCategoryAutoMessages (channel: TextChannel, creator?: User): Promise<void> {
		const categoryAutoMessages = await AutoMessageModel.find({
			guildId: channel.guild.id,
			targetType: AutoMessageTargetType.CATEGORY,
			targetId: channel.parentId,
			isActive: true
		})

		if (categoryAutoMessages.length === 0) {
			return
		}

		autoMessageLogger.info(
			`Canal ${channel.name} creado en categoría con ${categoryAutoMessages.length} mensajes automáticos`
		)

		for (const autoMessage of categoryAutoMessages) {
			const message = autoMessage.message
				? replaceVariables(autoMessage.message, { channel, guild: channel.guild, creator })
				: ""

			const embeds = autoMessage.embed
				? [replaceVariablesInEmbed(autoMessage.embed, { channel, guild: channel.guild, creator })]
				: []

			if (autoMessage.waitTime) {
				setTimeout(async () => {
					await this.sendMessageAndPin(channel, message, embeds, autoMessage.pin)
				}, autoMessage.waitTime * 1000)
			} else {
				await this.sendMessageAndPin(channel, message, embeds, autoMessage.pin)
			}
		}
	}

	async sendMessageAndPin (
		channel: TextChannel,
		message: string,
		embeds:Record<string, unknown>[],
		pin: boolean
	): Promise<void> {
		const setMessage = await channel.send({
			content: message,
			embeds
		})
		if (pin) {
			await setMessage.pin()
		}
	}

	register (): void {
		// TODO: Añadir el evento "channel: created" al sistema de eventos del bot y usarlo aquí en vez de registrar directamente con discord.js
		registerEvent(
			Events.ChannelCreate,
			async (channel: GuildBasedChannel) => {
				if (!channel.guild || channel.type !== ChannelType.GuildText || !channel.parentId) {
					return
				}

				try {
					const creator = await this.getChannelCreator(channel)
					await this.sendCategoryAutoMessages(channel as TextChannel, creator)
				} catch (error) {
					autoMessageLogger.error("Error al procesar canal nuevo para mensajes automáticos:", error)
				}
			},
			{
				module: "auto-messages"
			}
		)
	}
}
