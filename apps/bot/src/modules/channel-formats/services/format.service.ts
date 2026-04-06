import { Injectable } from "@/core/container"
import { IChannelFormat } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { FormatRepository, SaveFormatData } from "../repositories/format.repository"
import {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	GuildChannel,
	User
} from "discord.js"
import { CommandReply } from "@/core/types"

const formatLogger = botLogger.child("channel-format")

export interface ToggleResult {
	success: boolean
	format?: IChannelFormat
	message?: string
}

interface ConfigurateInput {
	name: string
	channel: GuildChannel
	pattern: string
	flags: string
	deleteMessage: boolean
	notify: boolean
}

interface FormatCommandInput {
	formatId: string
	guildId: string
	user: User
}

@Injectable(FormatRepository)
export class FormatService {
	constructor (
		private readonly repository: FormatRepository
	) {}

	private async saveFormat (data: SaveFormatData): Promise<void> {
		try {
			new RegExp(data.pattern, data.flags)
		} catch {
			throw new Error("El patrón no es una expresión regular válida.")
		}
		await this.repository.upsert(data)
		formatLogger.info(`Formato configurado en canal ${data.channelId} de guild ${data.guildId}`)
	}

	private async getFormats (guildId: string, includeDeleted: boolean): Promise<IChannelFormat[]> {
		return this.repository.findByGuild(guildId, includeDeleted)
	}

	private async deleteFormat (
		formatId: string,
		guildId: string,
		deletedBy: string
	): Promise<IChannelFormat | null> {
		return this.repository.softDelete(formatId, guildId, deletedBy)
	}

	private async toggleFormatState (
		formatId: string,
		guildId: string,
		newState: boolean
	): Promise<ToggleResult> {
		try {
			const format = await this.repository.findById(formatId, guildId)

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

			const updated = await this.repository.setActive(formatId, newState)
			if (!updated) {
				return { success: false, message: "❌ Error al cambiar el estado del formato." }
			}

			const action = newState ? "reanudado" : "pausado"
			formatLogger.info(`Formato ${action}: ${format.name} (${formatId})`)

			return { success: true, format: updated }
		} catch (error) {
			formatLogger.error("Error al cambiar estado del formato:", error)
			return { success: false, message: "❌ Error al cambiar el estado del formato." }
		}
	}

	// Métodos de construcción de embeds y menús
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
			} else if (format.isActive === false) {
				label = `⏸️ ${format.name.substring(0, 78)}`
				statusText = "Pausado"
			} else {
				label = `${format.name.substring(0, 80)}`
				statusText = "Activo"
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

	// Funciones que van directamente a los comandos
	async configurate (
		{ channel,
			name,
			pattern,
			flags,
			deleteMessage,
			notify,
			guildId }: ConfigurateInput & { guildId: string }): Promise<CommandReply> {

		try {
			await this.saveFormat({
				guildId,
				channelId: channel.id,
				name,
				pattern,
				flags,
				deleteMessage,
				notifyUser: notify
			})

			const embed = this.buildConfigEmbed({
				name,
				channel,
				pattern,
				flags,
				deleteMessage,
				notifyUser:
					notify
			})
			return { embeds: [embed] }
		} catch (error) {
			const isValidationError = error instanceof Error && error.message.includes("expresión regular")
			const content = isValidationError
				? `❌ ${(error as Error).message}`
				: "❌ Error al configurar el formato del canal."
			if (!isValidationError) {
				formatLogger.error("Error configurando formato:", error)
			}
			return { content }
		}
	}

	async info (verEliminados: boolean, guildId: string): Promise<CommandReply> {
		try {
			const formats = await this.getFormats(guildId, verEliminados)

			if (formats.length === 0) {
				const mensaje = verEliminados
					? "🗑️ No hay formatos eliminados en este servidor."
					: "⚙️ No hay formatos configurados. Usa `/formato configurar` para empezar."
				return { content: mensaje }
			}

			const embed = this.buildListEmbed(formats, verEliminados)
			const row = this.buildSelectMenuRow(formats, verEliminados)

			return { embeds: [embed], components: [row] }
		} catch (error) {
			formatLogger.error("Error obteniendo formatos:", error)
			return { content: "❌ Error al obtener los formatos." }
		}
	}

	async remove ({ formatId, guildId, user }: FormatCommandInput): Promise<CommandReply> {
		try {
			const format = await this.deleteFormat(formatId, guildId, user.id)

			if (!format) {
				return { content: `❌ No se encontró un formato activo con el ID \`${formatId}\`` }
			}

			formatLogger.info(
				`Formato ${format.name} eliminado (${formatId}) ` +
					`por ${user.tag} en guild ${guildId}`
			)
			return{ content: `✅ Formato \`${format.name}\` eliminado correctamente.` }

		} catch (error) {
			formatLogger.error("Error eliminando formato:", error)
			return { content: "❌ Error al eliminar el formato." }
		}
	}

	async toggleState ({
		formatId,
		guildId,
		user,
		newState
	}: FormatCommandInput & { newState: boolean }): Promise<CommandReply> {
		const result = await this.toggleFormatState(formatId, guildId, newState)

		if (!result.success || !result.format) {
			return { content: result.message ?? "❌ Error desconocido" }
		}

		const embed = new EmbedBuilder()
			.addFields(
				{ name: "Nombre", value: result.format.name, inline: true },
				{ name: "Canal", value: `<#${result.format.channelId}>`, inline: true },
				{ name: "ID", value: formatId, inline: true }
			)

		if (result.format.isActive === false) {
			embed
				.setColor(0xffa500)
				.setTitle("⏸️ Formato pausado")
				.setDescription("Puedes reactivarlo cuando quieras usando `/formato reanudar`")
				.setFooter({ text: `Pausado por ${user.tag}` })
		} else {
			embed
				.setColor(0x00ff00)
				.setTitle("▶️ Formato reanudado")
				.setDescription("El formato está activo nuevamente.")
				.setFooter({ text: `Reanudado por ${user.tag}` })
		}

		return { embeds: [embed] }
	}
}
