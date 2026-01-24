import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@types"
import { PermissionFlagsBits, EmbedBuilder, MessageFlags } from "discord.js"
import { ChannelFormatModel, IChannelFormat } from "@org/mongo"
import { botLogger } from "@/core/logger"

const formatLogger = botLogger.child("channel-format")

export class FormatCommand extends BaseCommand {
	async configurar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const channel = interaction.options.getChannel("canal", true)
		const pattern = interaction.options.getString("patron", true)
		const flags = interaction.options.getString("flags") || ""
		const deleteMsg = interaction.options.getBoolean("eliminar") ?? true
		const notify = interaction.options.getBoolean("notificar") ?? true

		try {
			// Validar que el patrón es una regex válida
			new RegExp(pattern, flags)
		} catch (error) {
			await interaction.reply({
				content: "❌ El patrón no es una expresión regular válida.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		try {
			await this.saveChannelFormat({
				guildId: interaction.guildId,
				channelId: channel.id,
				pattern,
				flags,
				deleteMessage: deleteMsg,
				notifyUser: notify
			})

			const embed = this.buildConfigEmbed({
				channel,
				pattern,
				flags,
				deleteMessage: deleteMsg,
				notifyUser: notify
			})
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })

			formatLogger.info(`Formato configurado en canal ${channel.id} de guild ${interaction.guildId}`)
		} catch (error) {
			formatLogger.error("Error configurando formato:", error)
			await interaction.reply({
				content: "❌ Error al configurar el formato del canal.",
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
			const formats = await ChannelFormatModel.find({ guildId: interaction.guildId })

			if (formats.length === 0) {
				await interaction.reply({
					content: "⚙️ No hay formatos configurados. Usa `/format configurar` para empezar.",
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const embed = this.buildViewEmbed(formats)
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			formatLogger.error("Error obteniendo formatos:", error)
			await interaction.reply({
				content: "❌ Error al obtener los formatos.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	async eliminar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const channel = interaction.options.getChannel("canal", true)

		try {
			const result = await ChannelFormatModel.deleteOne({
				guildId: interaction.guildId,
				channelId: channel.id
			})

			if (result.deletedCount === 0) {
				await interaction.reply({
					content: "⚠️ No hay formato configurado en ese canal.",
					flags: MessageFlags.Ephemeral
				})
				return
			}

			await interaction.reply({
				content: `✅ Formato eliminado del canal ${channel}`,
				flags: MessageFlags.Ephemeral
			})

			formatLogger.info(`Formato eliminado del canal ${channel.id} de guild ${interaction.guildId}`)
		} catch (error) {
			formatLogger.error("Error eliminando formato:", error)
			await interaction.reply({
				content: "❌ Error al eliminar el formato.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async saveChannelFormat (data: {
		guildId: string
		channelId: string
		pattern: string
		flags: string
		deleteMessage: boolean
		notifyUser: boolean
	}): Promise<void> {
		await ChannelFormatModel.findOneAndUpdate(
			{ guildId: data.guildId, channelId: data.channelId },
			data,
			{ upsert: true, new: true }
		)
	}

	private buildConfigEmbed (config: {
		channel: { id: string; toString(): string }
		pattern: string
		flags: string
		deleteMessage: boolean
		notifyUser: boolean
	}): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x57f287)
			.setTitle("✅ Formato Configurado")
			.addFields(
				{ name: "Canal", value: `${config.channel}`, inline: true },
				{ name: "Patrón", value: `\`${config.pattern}\``, inline: true },
				{ name: "Flags", value: config.flags || "ninguno", inline: true },
				{ name: "Eliminar mensajes", value: config.deleteMessage ? "✅ Sí" : "❌ No", inline: true },
				{ name: "Notificar usuario", value: config.notifyUser ? "✅ Sí" : "❌ No", inline: true }
			)
			.setTimestamp()
	}

	private buildViewEmbed (formats: IChannelFormat[]): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle("📋 Formatos de Canales")
			.setDescription(`Se han encontrado ${formats.length} formato(s) configurado(s)`)
			.setTimestamp()

		formats.forEach((format) => {
			const flags = format.flags || "ninguno"
			const options = []
			if (format.deleteMessage) {options.push("Elimina")}
			if (format.notifyUser) {options.push("Notifica")}

			embed.addFields({
				name: `<#${format.channelId}>`,
				value: `**Patrón:** \`${format.pattern}\`\n**Flags:** ${flags}\n**Opciones:** ${options.join(", ")}`,
				inline: false
			})
		})

		return embed
	}
}

// Registrar el comando
registerCommand(FormatCommand, {
	name: "formato",
	description: "Configura formatos de mensajes para canales",
	permissions: PermissionFlagsBits.ManageChannels,
	guildOnly: true
})

// Registrar subcomandos
registerSubCommand(FormatCommand, "configurar", {
	name: "configurar",
	description: "Configura un formato para un canal",
	options: [
		{
			name: "canal",
			description: "Canal a configurar",
			type: OptionType.CHANNEL,
			required: true
		},
		{
			name: "patron",
			description: "Patrón regex (ej: \\d+ para solo números)",
			type: OptionType.STRING,
			required: true
		},
		{
			name: "flags",
			description: "Flags del regex (ej: i para case-insensitive)",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "eliminar",
			description: "Eliminar mensajes que no cumplan (default: true)",
			type: OptionType.BOOLEAN,
			required: false
		},
		{
			name: "notificar",
			description: "Notificar al usuario (default: true)",
			type: OptionType.BOOLEAN,
			required: false
		}
	]
})

registerSubCommand(FormatCommand, "ver", {
	name: "ver",
	description: "Ver formatos configurados"
})

registerSubCommand(FormatCommand, "eliminar", {
	name: "eliminar",
	description: "Eliminar formato de un canal",
	options: [
		{
			name: "canal",
			description: "Canal del cual eliminar el formato",
			type: OptionType.CHANNEL,
			required: true
		}
	]
})
