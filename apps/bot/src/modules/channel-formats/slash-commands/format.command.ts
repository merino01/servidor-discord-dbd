import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@core/decorators/command.decorators"
import { CommandContext, OptionType } from "@/core/types"
import {
	PermissionFlagsBits,
	EmbedBuilder,
	MessageFlags
} from "discord.js"
import { botLogger } from "@/core/logger"
import { FormatService } from "../services/format.service"

const formatLogger = botLogger.child("channel-format")

@Injectable(FormatService)
@SlashCommand({
	name: "formato",
	description: "Configura formatos de mensajes para canales",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages,
	guildOnly: true
})
export class FormatCommand {
	constructor (
		private readonly service: FormatService
	) {}

	@Subcommand({
		name: "configurar",
		description: "Configura un formato para un canal",
		options: [
			{
				name: "nombre",
				description: "Nombre identificador del formato",
				type: OptionType.STRING,
				required: true
			},
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
	async configurar ({ interaction }: CommandContext): Promise<void> {
		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const name = interaction.options.getString("nombre", true)
		const channel = interaction.options.getChannel("canal", true)
		const pattern = interaction.options.getString("patron", true)
		const flags = interaction.options.getString("flags") || ""
		const deleteMsg = interaction.options.getBoolean("eliminar") ?? true
		const notify = interaction.options.getBoolean("notificar") ?? true

		try {
			await this.service.saveFormat({
				guildId: interaction.guildId,
				channelId: channel.id,
				name,
				pattern,
				flags,
				deleteMessage: deleteMsg,
				notifyUser: notify
			})

			const embed = this.service.buildConfigEmbed({
				name,
				channel,
				pattern,
				flags,
				deleteMessage:
				deleteMsg,
				notifyUser:
				notify
			})
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
		} catch (error) {
			const isValidationError = error instanceof Error && error.message.includes("expresión regular")
			const content = isValidationError
				? `❌ ${(error as Error).message}`
				: "❌ Error al configurar el formato del canal."
			if (!isValidationError) {
				formatLogger.error("Error configurando formato:", error)
			}
			await interaction.reply({ content, flags: MessageFlags.Ephemeral })
		}
	}

	@Subcommand({
		name: "info",
		description: "Lista todos los formatos configurados",
		options: [
			{
				name: "ver-eliminados",
				description: "Mostrar formatos eliminados",
				type: OptionType.BOOLEAN,
				required: false
			}
		]
	})
	async info ({ interaction }: CommandContext): Promise<void> {
		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		try {
			const formats = await this.service.getFormats(interaction.guildId, verEliminados)

			if (formats.length === 0) {
				const mensaje = verEliminados
					? "🗑️ No hay formatos eliminados en este servidor."
					: "⚙️ No hay formatos configurados. Usa `/formato configurar` para empezar."
				await interaction.reply({ content: mensaje, flags: MessageFlags.Ephemeral })
				return
			}

			const embed = this.service.buildListEmbed(formats, verEliminados)
			const row = this.service.buildSelectMenuRow(formats, verEliminados)

			await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral })
		} catch (error) {
			formatLogger.error("Error obteniendo formatos:", error)
			await interaction.reply({ content: "❌ Error al obtener los formatos.", flags: MessageFlags.Ephemeral })
		}
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina un formato",
		options: [
			{
				name: "id",
				description: "ID del formato a eliminar",
				type: OptionType.STRING,
				required: true
			}
		]
	})
	async eliminar ({ interaction }: CommandContext): Promise<void> {
		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const formatId = interaction.options.getString("id", true)

		try {
			const format = await this.service.deleteFormat(formatId, interaction.guildId, interaction.user.id)

			if (!format) {
				await interaction.reply({
					content: `❌ No se encontró un formato activo con el ID \`${formatId}\``,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			await interaction.reply({
				content: `✅ Formato \`${format.name}\` eliminado correctamente.`,
				flags: MessageFlags.Ephemeral
			})

			formatLogger.info(
				`Formato ${format.name} eliminado (${formatId}) ` +
				`por ${interaction.user.tag} en guild ${interaction.guildId}`
			)
		} catch (error) {
			formatLogger.error("Error eliminando formato:", error)
			await interaction.reply({ content: "❌ Error al eliminar el formato.", flags: MessageFlags.Ephemeral })
		}
	}

	@Subcommand({
		name: "pausar",
		description: "Pausa un formato sin eliminarlo",
		options: [
			{
				name: "id",
				description: "ID del formato a pausar",
				type: OptionType.STRING,
				required: true
			}
		]
	})
	async pausar ({ interaction }: CommandContext): Promise<void> {
		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const formatId = interaction.options.getString("id", true)
		const result = await this.service.toggleFormatState(formatId, interaction.guildId, false)

		if (!result.success || !result.format) {
			await interaction.reply({
				content: result.message ?? "❌ Error desconocido",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0xffa500)
			.setTitle("⏸️ Formato pausado")
			.addFields(
				{ name: "Nombre", value: result.format.name, inline: true },
				{ name: "Canal", value: `<#${result.format.channelId}>`, inline: true },
				{ name: "ID", value: formatId, inline: true }
			)
			.setDescription("Puedes reactivarlo cuando quieras usando `/formato reanudar`")
			.setFooter({ text: `Pausado por ${interaction.user.tag}` })

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "reanudar",
		description: "Reanuda un formato pausado",
		options: [
			{
				name: "id",
				description: "ID del formato a reanudar",
				type: OptionType.STRING,
				required: true
			}
		]
	})
	async reanudar ({ interaction }: CommandContext): Promise<void> {
		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const formatId = interaction.options.getString("id", true)
		const result = await this.service.toggleFormatState(formatId, interaction.guildId, true)

		if (!result.success || !result.format) {
			await interaction.reply({
				content: result.message ?? "❌ Error desconocido",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("▶️ Formato reanudado")
			.addFields(
				{ name: "Nombre", value: result.format.name, inline: true },
				{ name: "Canal", value: `<#${result.format.channelId}>`, inline: true },
				{ name: "ID", value: formatId, inline: true }
			)
			.setDescription("El formato está activo nuevamente.")
			.setFooter({ text: `Reanudado por ${interaction.user.tag}` })

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
	}
}
