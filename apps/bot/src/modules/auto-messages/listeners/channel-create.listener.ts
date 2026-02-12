import { registerEvent } from "@/core/event-registry"
import { Events, ChannelType, GuildBasedChannel, TextChannel, AuditLogEvent, User } from "discord.js"
import { AutoMessageModel, AutoMessageTargetType } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { replaceVariables, replaceVariablesInEmbed } from "../allowed-variables"

const autoMessageLogger = botLogger.child("auto-messages")

async function getChannelCreator (channel: GuildBasedChannel): Promise<User | undefined> {
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

async function sendCategoryAutoMessages (channel: TextChannel, creator?: User): Promise<void> {
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

		const time = (autoMessage.waitTime ?? 0) * 1000
		setTimeout(async () => {
			const setMessage = await channel.send({
				content: message,
				embeds
			})
			if (autoMessage.pin) {
				await setMessage.pin()
			}
		}, time)
	}
}

registerEvent(
	Events.ChannelCreate,
	async (channel: GuildBasedChannel) => {
		if (!channel.guild || channel.type !== ChannelType.GuildText || !channel.parentId) {
			return
		}

		try {
			const creator = await getChannelCreator(channel)
			await sendCategoryAutoMessages(channel as TextChannel, creator)
		} catch (error) {
			autoMessageLogger.error("Error al procesar canal nuevo para mensajes automáticos:", error)
		}
	},
	{
		module: "auto-messages"
	}
)
