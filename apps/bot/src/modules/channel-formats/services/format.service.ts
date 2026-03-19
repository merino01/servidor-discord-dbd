import { Injectable } from "@/core/container"
import { IChannelFormat } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { FormatRepository, SaveFormatData } from "../repositories/format.repository"
import {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from "discord.js"

const formatLogger = botLogger.child("channel-format")

export interface ToggleResult {
	success: boolean
	format?: IChannelFormat
	message?: string
}

@Injectable(FormatRepository)
export class FormatService {
	constructor (
		private readonly repository: FormatRepository
	) {}

	public async saveFormat (data: SaveFormatData): Promise<void> {
		try {
			new RegExp(data.pattern, data.flags)
		} catch {
			throw new Error("El patrón no es una expresión regular válida.")
		}
		await this.repository.upsert(data)
		formatLogger.info(`Formato configurado en canal ${data.channelId} de guild ${data.guildId}`)
	}

	public async getFormats (guildId: string, includeDeleted: boolean): Promise<IChannelFormat[]> {
		return this.repository.findByGuild(guildId, includeDeleted)
	}

	public async deleteFormat (
		formatId: string,
		guildId: string,
		deletedBy: string
	): Promise<IChannelFormat | null> {
		return this.repository.softDelete(formatId, guildId, deletedBy)
	}

	public async toggleFormatState (
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
	public buildConfigEmbed (config: {
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

	public buildListEmbed (formats: IChannelFormat[], verEliminados: boolean): EmbedBuilder {
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

	public buildSelectMenuOptions (
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

	public buildSelectMenuRow (
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
