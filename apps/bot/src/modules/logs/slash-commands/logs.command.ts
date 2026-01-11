import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"
import { PermissionFlagsBits, EmbedBuilder, MessageFlags } from "discord.js"
import { LogConfigModel, LogType, ILogConfig } from "@org/mongo"
import { botLogger } from "@/core/logger"

const logsLogger = botLogger.child("logs")

export class LogsCommand extends BaseCommand {
	private async getOrCreateLogConfig (guildId: string) {
		let config = await LogConfigModel.findOne({ guildId })

		if (!config) {
			config = await LogConfigModel.create({
				guildId,
				commands: { enabled: false },
				messages: { enabled: false, logDeleted: true, logEdited: true },
				voice: { enabled: false, logJoin: true, logLeave: true, logMove: true },
				moderation: { enabled: false, logTimeouts: true, logKicks: true, logBans: true },
				members: { enabled: false, logJoin: true, logLeave: true }
			})
		}

		return config
	}

	private updateLogConfig (
		config: ILogConfig,
		tipo: LogType,
		habilitado: boolean,
		canalId?: string
	): void {
		const configMap: Record<LogType, { enabled: boolean; channelId?: string }> = {
			[LogType.COMMANDS]: config.commands,
			[LogType.MESSAGES]: config.messages,
			[LogType.VOICE]: config.voice,
			[LogType.MODERATION]: config.moderation,
			[LogType.MEMBERS]: config.members
		}

		const targetConfig = configMap[tipo]
		targetConfig.enabled = habilitado
		if (canalId) {
			targetConfig.channelId = canalId
		}
	}

	private buildConfigEmbed (tipo: LogType, habilitado: boolean, canal?: any): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(habilitado ? 0x57f287 : 0xed4245)
			.setTitle(`${habilitado ? "✅" : "❌"} Configuración de Logs`)
			.addFields(
				{ name: "Tipo", value: this.getTipoLabel(tipo), inline: true },
				{ name: "Estado", value: habilitado ? "Habilitado" : "Deshabilitado", inline: true }
			)
			.setTimestamp()

		if (canal) {
			embed.addFields({ name: "Canal", value: `${canal}`, inline: true })
		}

		return embed
	}

	async configurar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const tipo = interaction.options.getString("tipo", true) as LogType
		const habilitado = interaction.options.getBoolean("habilitado", true)
		const canal = interaction.options.getChannel("canal")

		try {
			const config = await this.getOrCreateLogConfig(interaction.guildId)
			this.updateLogConfig(config, tipo, habilitado, canal?.id)
			await config.save()

			logsLogger.info(
				`Logs de ${tipo} ${habilitado ? "habilitados" : "deshabilitados"} en guild ${interaction.guildId}`
			)

			const embed = this.buildConfigEmbed(tipo, habilitado, canal)
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			logsLogger.error("Error configurando logs:", error)
			await interaction.reply({
				content: "❌ Error al configurar los logs.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	async ver (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		try {
			const config = await LogConfigModel.findOne({ guildId: interaction.guildId })

			if (!config) {
				await this.sendNoConfigMessage(interaction)
				return
			}

			const embed = this.buildViewEmbed(config)
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			logsLogger.error("Error obteniendo configuración de logs:", error)
			await interaction.reply({
				content: "❌ Error al obtener la configuración de logs.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async sendNoConfigMessage (interaction: CommandContext["interaction"]): Promise<void> {
		await interaction.reply({
			content: "⚙️ No hay configuración de logs. Usa `/logs configurar` para empezar.",
			flags: MessageFlags.Ephemeral
		})
	}

	private buildViewEmbed (config: ILogConfig): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle("📋 Configuración de Logs")
			.setDescription("Estado actual de los logs en este servidor")
			.addFields(
				{
					name: "📝 Comandos",
					value: this.formatLogConfig(config.commands.enabled, config.commands.channelId),
					inline: false
				},
				{
					name: "💬 Mensajes",
					value: this.formatLogConfig(config.messages.enabled, config.messages.channelId),
					inline: false
				},
				{
					name: "🔊 Voz",
					value: this.formatLogConfig(config.voice.enabled, config.voice.channelId),
					inline: false
				},
				{
					name: "🛡️ Moderación",
					value: this.formatLogConfig(config.moderation.enabled, config.moderation.channelId),
					inline: false
				},
				{
					name: "👥 Miembros",
					value: this.formatLogConfig(config.members.enabled, config.members.channelId),
					inline: false
				}
			)
			.setTimestamp()
	}

	private getTipoLabel (tipo: LogType): string {
		const labels: Record<LogType, string> = {
			[LogType.COMMANDS]: "📝 Comandos",
			[LogType.MESSAGES]: "💬 Mensajes",
			[LogType.VOICE]: "🔊 Voz",
			[LogType.MODERATION]: "🛡️ Moderación",
			[LogType.MEMBERS]: "👥 Miembros"
		}
		return labels[tipo]
	}

	private formatLogConfig (enabled: boolean, channelId?: string): string {
		if (!enabled) {
			return "❌ Deshabilitado"
		}
		if (channelId) {
			return `✅ Habilitado → <#${channelId}>`
		}
		return "✅ Habilitado (sin canal configurado)"
	}
}

// Registrar el comando
registerCommand(LogsCommand, {
	name: "logs",
	description: "Configura el sistema de logs del servidor",
	permissions: PermissionFlagsBits.ManageGuild,
	guildOnly: true
})

// Registrar subcomandos
registerSubCommand(LogsCommand, "configurar", {
	name: "configurar",
	description: "Configura un tipo de log",
	options: [
		{
			name: "tipo",
			description: "Tipo de log a configurar",
			type: OptionType.STRING,
			required: true,
			choices: [
				{ name: "📝 Comandos", value: LogType.COMMANDS },
				{ name: "💬 Mensajes", value: LogType.MESSAGES },
				{ name: "🔊 Voz", value: LogType.VOICE },
				{ name: "🛡️ Moderación", value: LogType.MODERATION },
				{ name: "👥 Miembros", value: LogType.MEMBERS }
			]
		},
		{
			name: "habilitado",
			description: "Activar o desactivar este tipo de log",
			type: OptionType.BOOLEAN,
			required: true
		},
		{
			name: "canal",
			description: "Canal donde se enviarán los logs",
			type: OptionType.CHANNEL,
			required: false
		}
	]
})

registerSubCommand(LogsCommand, "ver", {
	name: "ver",
	description: "Ver la configuración actual de logs"
})
