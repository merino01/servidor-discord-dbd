import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext } from "@types"
import {
	PermissionFlagsBits,
	EmbedBuilder,
	MessageFlags,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ApplicationCommandOptionType,
	ChannelType
} from "discord.js"
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

		const name = interaction.options.getString("nombre", true)
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
				name,
				pattern,
				flags,
				deleteMessage: deleteMsg,
				notifyUser: notify
			})

			const embed = this.buildConfigEmbed({
				name,
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

	async info (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		try {
			const filter: Record<string, unknown> = { guildId: interaction.guildId }

			if (verEliminados) {
				filter.deletedAt = { $ne: null }
			} else {
				filter.deletedAt = null
			}

			const formats = await ChannelFormatModel.find(filter).sort({ createdAt: -1 })

			if (formats.length === 0) {
				const mensaje = verEliminados
					? "🗑️ No hay formatos eliminados en este servidor."
					: "⚙️ No hay formatos configurados. Usa `/formato configurar` para empezar."
				await interaction.reply({
					content: mensaje,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			const embed = this.buildListEmbed(formats, verEliminados)
			const row = this.buildSelectMenuRow(formats, verEliminados)

			await interaction.reply({
				embeds: [embed],
				components: [row],
				flags: MessageFlags.Ephemeral
			})
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

		const formatId = interaction.options.getString("id", true)

		try {
			const format = await ChannelFormatModel.findOneAndUpdate(
				{
					_id: formatId,
					guildId: interaction.guildId,
					isActive: true
				},
				{
					isActive: false,
					deletedBy: interaction.user.id,
					deletedAt: new Date()
				},
				{ new: false }
			)

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
			await interaction.reply({
				content: "❌ Error al eliminar el formato.",
				flags: MessageFlags.Ephemeral
			})
		}
	}

	private async toggleFormatState (
		formatId: string,
		guildId: string,
		newState: boolean
	): Promise<{ success: boolean; format?: IChannelFormat; message?: string }> {
		try {
			const format = await ChannelFormatModel.findOne({
				_id: formatId,
				guildId,
				deletedAt: null
			})

			if (!format) {
				return {
					success: false,
					message: `❌ No se encontró un formato activo con el ID \`${formatId}\``
				}
			}

			if (format.isActive === newState) {
				const action = newState ? "activo" : "pausado"
				return {
					success: false,
					message: `⚠️ El formato "${format.name}" ya está ${action}.`
				}
			}

			format.isActive = newState
			await format.save()

			const action = newState ? "reanudado" : "pausado"
			formatLogger.info(`Formato ${action}: ${format.name} (${formatId})`)

			return { success: true, format }
		} catch (error) {
			formatLogger.error("Error al cambiar estado del formato:", error)
			return {
				success: false,
				message: "❌ Error al cambiar el estado del formato."
			}
		}
	}

	async pausar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const formatId = interaction.options.getString("id", true)
		const result = await this.toggleFormatState(formatId, interaction.guildId, false)

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

	async reanudar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guildId) {
			await interaction.reply({
				content: "❌ Este comando solo funciona en servidores.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const formatId = interaction.options.getString("id", true)
		const result = await this.toggleFormatState(formatId, interaction.guildId, true)

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

	private async saveChannelFormat (data: {
		guildId: string
		channelId: string
		name: string
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
		name: string
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
				{ name: "Nombre", value: config.name, inline: true },
				{ name: "Canal", value: `${config.channel}`, inline: true },
				{ name: "Patrón", value: `\`${config.pattern}\``, inline: true },
				{ name: "Flags", value: config.flags || "ninguno", inline: true },
				{ name: "Eliminar mensajes", value: config.deleteMessage ? "✅ Sí" : "❌ No", inline: true },
				{ name: "Notificar usuario", value: config.notifyUser ? "✅ Sí" : "❌ No", inline: true }
			)
			.setTimestamp()
	}

	private buildListEmbed (formats: IChannelFormat[], verEliminados: boolean): EmbedBuilder {
		const titulo = verEliminados
			? `🗑️ Formatos eliminados (${formats.length})`
			: `📋 Formatos de canales (${formats.length})`

		const embed = new EmbedBuilder()
			.setColor(verEliminados ? 0xff0000 : 0x5865f2)
			.setTitle(titulo)
			.setDescription("Selecciona un formato del menú para ver sus detalles")

		if (formats.length > 25) {
			embed.setFooter({ text: `Mostrando 25 de ${formats.length}` })
		}

		return embed
	}

	private buildSelectMenuOptions (
		formats: IChannelFormat[],
		verEliminados: boolean
	): StringSelectMenuOptionBuilder[] {
		return formats.slice(0, 25).map((format) => {
			const formatId = format._id.toString().slice(-6)
			const flags = format.flags || "none"

			let label: string
			let statusText: string

			if (verEliminados && format.deletedAt) {
				const fecha = new Date(format.deletedAt).toLocaleDateString("es-ES")
				label = `🗑️ [${fecha}] ${format.name.substring(0, 60)}`
				statusText = "Eliminado"
			} else {
				if (!format.isActive) {
					label = `⏸️ ${format.name.substring(0, 78)}`
					statusText = "Pausado"
				} else {
					label = `${format.name.substring(0, 80)}`
					statusText = "Activo"
				}
			}

			const description = `${statusText} | Flags: ${flags} | ID: ${formatId}`

			return new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(description)
				.setValue(format._id.toString())
		})
	}

	private buildSelectMenuRow (
		formats: IChannelFormat[],
		verEliminados: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const options = this.buildSelectMenuOptions(formats, verEliminados)
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("format_select")
			.setPlaceholder("Selecciona un formato...")
			.addOptions(options)

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
	}
}

// Registrar el comando
registerCommand(FormatCommand, {
	name: "formato",
	description: "Configura formatos de mensajes para canales",
	permissions: PermissionFlagsBits.ManageChannels & PermissionFlagsBits.ManageMessages,
	guildOnly: true
})

// Registrar subcomandos
registerSubCommand(FormatCommand, "configurar", {
	name: "configurar",
	description: "Configura un formato para un canal",
	options: [
		{
			name: "nombre",
			description: "Nombre identificador del formato",
			type: ApplicationCommandOptionType.String,
			required: true
		},
		{
			name: "canal",
			description: "Canal a configurar",
			type: ApplicationCommandOptionType.Channel,
			channelTypes:[ChannelType.GuildText],
			required: true
		},
		{
			name: "patron",
			description: "Patrón regex (ej: \\d+ para solo números)",
			type: ApplicationCommandOptionType.String,
			required: true
		},
		{
			name: "flags",
			description: "Flags del regex (ej: i para case-insensitive)",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "eliminar",
			description: "Eliminar mensajes que no cumplan (default: true)",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		},
		{
			name: "notificar",
			description: "Notificar al usuario (default: true)",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		}
	]
})

registerSubCommand(FormatCommand, "info", {
	name: "info",
	description: "Lista todos los formatos configurados",
	options: [
		{
			name: "ver-eliminados",
			description: "Mostrar formatos eliminados",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		}
	]
})

registerSubCommand(FormatCommand, "eliminar", {
	name: "eliminar",
	description: "Elimina un formato",
	options: [
		{
			name: "id",
			description: "ID del formato a eliminar",
			type: ApplicationCommandOptionType.String,
			required: true
		}
	]
})

registerSubCommand(FormatCommand, "pausar", {
	name: "pausar",
	description: "Pausa un formato sin eliminarlo",
	options: [
		{
			name: "id",
			description: "ID del formato a pausar",
			type: ApplicationCommandOptionType.String,
			required: true
		}
	]
})

registerSubCommand(FormatCommand, "reanudar", {
	name: "reanudar",
	description: "Reanuda un formato pausado",
	options: [
		{
			name: "id",
			description: "ID del formato a reanudar",
			type: ApplicationCommandOptionType.String,
			required: true
		}
	]
})
