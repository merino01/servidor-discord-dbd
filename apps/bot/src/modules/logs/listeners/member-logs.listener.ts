import { Events, GuildMember, EmbedBuilder, PartialGuildMember } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { LogConfigModel } from "@org/mongo"
import { logger } from "@org/logger"
import { BotInstance } from "@/core/bot-instance"

const logsLogger = logger.child("logs")

async function sendJoinLogEmbed (member: GuildMember, channelId: string): Promise<void> {
	const bot = BotInstance.getOrNull()
	if (!bot) {
		return
	}

	const channel = await bot.channels.fetch(channelId).catch(() => null)
	if (!channel?.isTextBased() || !("send" in channel)) {
		return
	}

	const accountAge = Date.now() - member.user.createdAt.getTime()
	const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24))

	const embed = new EmbedBuilder()
		.setColor(0x00ff00)
		.setTitle("👋 Miembro unido al servidor")
		.setThumbnail(member.user.displayAvatarURL())
		.addFields(
			{ name: "Usuario", value: `${member.user} (${member.user.tag})`, inline: true },
			{ name: "ID", value: member.user.id, inline: true },
			{ name: "Miembros Totales", value: `${member.guild.memberCount}`, inline: true },
			{ name: "Cuenta Creada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
			{ name: "Antigüedad", value: `${accountAgeDays} días`, inline: true }
		)
		.setTimestamp()
		.setFooter({ text: `ID: ${member.user.id}` })

	await channel.send({ embeds: [embed] })
}

async function sendLeaveLogEmbed (member: GuildMember | PartialGuildMember, channelId: string): Promise<void> {
	const bot = BotInstance.getOrNull()
	if (!bot) {
		return
	}

	const channel = await bot.channels.fetch(channelId).catch(() => null)
	if (!channel?.isTextBased() || !("send" in channel)) {
		return
	}

	const joinedAt = member.joinedAt
	const timeInServer = joinedAt ? Date.now() - joinedAt.getTime() : null
	const daysInServer = timeInServer ? Math.floor(timeInServer / (1000 * 60 * 60 * 24)) : null

	const embed = new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle("👋 Miembro salió del servidor")
		.setThumbnail(member.user.displayAvatarURL())
		.addFields(
			{ name: "Usuario", value: `${member.user} (${member.user.tag})`, inline: true },
			{ name: "ID", value: member.user.id, inline: true },
			{ name: "Miembros Totales", value: `${member.guild.memberCount}`, inline: true }
		)
		.setTimestamp()
		.setFooter({ text: `ID: ${member.user.id}` })

	if (joinedAt && daysInServer !== null) {
		embed.addFields(
			{ name: "Se Unió", value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>`, inline: true },
			{ name: "Tiempo en Servidor", value: `${daysInServer} días`, inline: true }
		)
	}

	await channel.send({ embeds: [embed] })
}

/**
 * Listener para logs de miembros que se unen al servidor
 */
registerEvent(Events.GuildMemberAdd, async (member: GuildMember) => {
	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })

		if (!config?.members.enabled || !config.members.logJoin) {
			return
		}

		if (config.members.channelId) {
			await sendJoinLogEmbed(member, config.members.channelId)
		}
	} catch (error) {
		logsLogger.error("Error en listener de member join:", error)
	}
})

/**
 * Listener para logs de miembros que salen del servidor
 */
registerEvent(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })

		if (!config?.members.enabled || !config.members.logLeave) {
			return
		}

		if (config.members.channelId) {
			await sendLeaveLogEmbed(member, config.members.channelId)
		}
	} catch (error) {
		logsLogger.error("Error en listener de member leave:", error)
	}
})
