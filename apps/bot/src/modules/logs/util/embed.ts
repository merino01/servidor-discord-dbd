import { ILogConfig, LogType } from "@org/mongo"
import { EmbedBuilder } from "discord.js"

const getTipoLabel = (tipo: LogType): string => {
	const labels: Record<LogType, string> = {
		[LogType.COMMANDS]: "📝 Comandos",
		[LogType.CLANS]: "📋 Clanes",
		[LogType.MESSAGES]: "💬 Mensajes",
		[LogType.VOICE]: "🔊 Voz",
		[LogType.MODERATION]: "🛡️ Moderación",
		[LogType.MEMBERS]: "👥 Miembros"
	}
	return labels[tipo]
}

const formatLogConfig = (enabled: boolean, channelId?: string): string => {
	if (!enabled) {
		return "❌ Deshabilitado"
	}
	if (channelId) {
		return `✅ Habilitado → <#${channelId}>`
	}
	return "✅ Habilitado (sin canal configurado)"
}

export const buildConfigEmbed = (tipo: LogType, habilitado: boolean, canal?: any): EmbedBuilder => {
	const embed = new EmbedBuilder()
		.setColor(habilitado ? 0x57f287 : 0xed4245)
		.setTitle(`${habilitado ? "✅" : "❌"} Configuración de Logs`)
		.addFields(
			{ name: "Tipo", value: getTipoLabel(tipo), inline: true },
			{ name: "Estado", value: habilitado ? "Habilitado" : "Deshabilitado", inline: true }
		)
		.setTimestamp()

	if (canal) {
		embed.addFields({ name: "Canal", value: `${canal}`, inline: true })
	}

	return embed
}

export const buildViewEmbed = (config: ILogConfig): EmbedBuilder => new EmbedBuilder()
	.setColor(0x5865f2)
	.setTitle("📋 Configuración de Logs")
	.setDescription("Estado actual de los logs en este servidor")
	.addFields(
		{
			name: "📝 Comandos",
			value: formatLogConfig(config.commands.enabled, config.commands.channelId),
			inline: false
		},
		{
			name: "💬 Mensajes",
			value: formatLogConfig(config.messages.enabled, config.messages.channelId),
			inline: false
		},
		{
			name: "🔊 Voz",
			value: formatLogConfig(config.voice.enabled, config.voice.channelId),
			inline: false
		},
		{
			name: "🛡️ Moderación",
			value: formatLogConfig(config.moderation.enabled, config.moderation.channelId),
			inline: false
		},
		{
			name: "👥 Miembros",
			value: formatLogConfig(config.members.enabled, config.members.channelId),
			inline: false
		}
	)
	.setTimestamp()
