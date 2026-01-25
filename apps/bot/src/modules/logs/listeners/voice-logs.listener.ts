import { botEvents } from "@/core/events/bot-events"
import { LogConfigModel } from "@org/mongo"
import { logger } from "@org/logger"
import { EmbedBuilder, TextChannel, GuildMember, VoiceState } from "discord.js"
import { BotInstance } from "@/core/bot-instance"

const logsLogger = logger.child("logs")

// Colores para cada tipo de evento de voz
const VOICE_COLORS = {
	JOIN: 0x9b59b6,      // Morado
	LEAVE: 0xe74c3c,     // Rojo
	MOVE: 0xe67e22,      // Naranja
	MUTE: 0x2ecc71,      // Verde
	UNMUTE: 0x1abc9c,    // Verde claro/turquesa
	DEAF: 0x3498db,      // Azul
	UNDEAF: 0x5dade2     // Azul claro
}

async function sendVoiceLogEmbed (
	guildId: string,
	channelId: string,
	embed: EmbedBuilder
): Promise<void> {
	const bot = BotInstance.getOrNull()
	if (!bot) {return}

	const channel = await bot.channels.fetch(channelId)
	if (!channel?.isTextBased()) {return}

	await (channel as TextChannel).send({ embeds: [embed] })
}

/**
 * Listener de usuario entra a canal de voz
 */
botEvents.on("voice:join", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.logJoin && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.JOIN)
				.setTitle("🟣 Usuario entró a canal de voz")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (join):", error)
	}
})

/**
 * Listener de usuario sale de canal de voz
 */
botEvents.on("voice:leave", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.logLeave && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.LEAVE)
				.setTitle("🔴 Usuario salió de canal de voz")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (leave):", error)
	}
})

/**
 * Listener de usuario se mueve entre canales
 */
botEvents.on("voice:move", async (
	member: GuildMember,
	oldState: VoiceState,
	newState: VoiceState
) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.logMove && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.MOVE)
				.setTitle("🟠 Usuario se movió de canal")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal anterior", value: `<#${oldState.channelId}>`, inline: true },
					{ name: "Canal nuevo", value: `<#${newState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (move):", error)
	}
})

/**
 * Listener de usuario se silencia
 */
botEvents.on("voice:mute", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.MUTE)
				.setTitle("🟢 Usuario se silenció")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (mute):", error)
	}
})

/**
 * Listener de usuario se desilencia
 */
botEvents.on("voice:unmute", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.UNMUTE)
				.setTitle("🔵 Usuario se desilenció")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (unmute):", error)
	}
})

/**
 * Listener de usuario se ensordece
 */
botEvents.on("voice:deaf", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.DEAF)
				.setTitle("🔵 Usuario se ensordeció")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (deaf):", error)
	}
})

/**
 * Listener de usuario se desensordece
 */
botEvents.on("voice:undeaf", async (member: GuildMember, voiceState: VoiceState) => {
	if (!member.guild.id) {return}

	try {
		const config = await LogConfigModel.findOne({ guildId: member.guild.id })
		const voiceConfig = config?.voice

		if (voiceConfig?.enabled && voiceConfig.channelId) {
			const embed = new EmbedBuilder()
				.setColor(VOICE_COLORS.UNDEAF)
				.setTitle("💠 Usuario se desensordeció")
				.addFields(
					{ name: "Usuario", value: `${member} (${member.user.tag})`, inline: true },
					{ name: "Canal", value: `<#${voiceState.channelId}>`, inline: true }
				)
				.setTimestamp()

			await sendVoiceLogEmbed(member.guild.id, voiceConfig.channelId, embed)
		}
	} catch (error) {
		logsLogger.error("Error procesando log de voz (undeaf):", error)
	}
})

logsLogger.info("Listeners de logs de voz registrados")
