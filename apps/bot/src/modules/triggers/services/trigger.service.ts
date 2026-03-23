import { Injectable } from "@/core/container"
import { botLogger } from "@/core/logger"
import { CommandReply } from "@/core/types"
import { ITrigger, TriggerMatchType } from "@org/mongo"
import { ActionRowBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	User
} from "discord.js"
import { TriggerRepository } from "../repositories/triggers.repository"

const triggerLogger = botLogger.child("triggers")

interface Options {
	triggerText: string
	response: string
	matchType: TriggerMatchType
	caseSensitive: boolean
	channels: string[]
	excludeChannels: boolean
	deleteOriginalMessage: boolean
	regexFlags?: string | null
}

@Injectable(TriggerRepository)
export class TriggerService {
	constructor (private readonly repository: TriggerRepository) {}
	private getChannelsFromOptions (interaction: ChatInputCommandInteraction): string[] {
		const channels: string[] = []
		for (let i = 1; i <= 5; i++) {
			const channel = interaction.options.getChannel(`canal${i}`)
			if (channel) {
				channels.push(channel.id)
			}
		}
		return channels
	}

	private async checkDuplicateTrigger (
		guildId: string,
		triggerText: string,
		caseSensitive: boolean
	): Promise<string | null> {
		if (caseSensitive) {return null}

		const existing = await this.repository.findByRegexDb(
			guildId,
			triggerText,
			new RegExp(`^${triggerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
		)

		return existing ? existing.trigger : null
	}

	private buildTriggerEmbed (options: {
			trigger: ITrigger
			matchType: string
			caseSensitive: boolean
			channels: string[]
			excludeChannels: boolean
		}): EmbedBuilder {
		const { trigger, matchType, caseSensitive, channels, excludeChannels } = options

		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Trigger creado")
			.addFields(
				{ name: "Texto", value: `\`${trigger.trigger}\``, inline: true },
				{ name: "Tipo", value: matchType, inline: true },
				{ name: "Case Sensitive", value: caseSensitive ? "Sí" : "No", inline: true },
				{ name: "Respuesta", value: trigger.response.substring(0, 100), inline: false }
			)

		if (channels.length > 0) {
			const channelText = channels.map((c) => `<#${c}>`).join(", ")
			const label = excludeChannels ? "Excluir canales" : "Solo en canales"
			embed.addFields({ name: label, value: channelText, inline: false })
		}

		embed.setFooter({ text: `ID: ${trigger._id}` })
		return embed
	}

	public extractCrearOptions (interaction: ChatInputCommandInteraction): Options {
		return {
			triggerText: interaction.options.getString("texto", true),
			response: interaction.options.getString("respuesta", true),
			matchType: (interaction.options.getString("tipo") as TriggerMatchType) || TriggerMatchType.WORD,
			caseSensitive: interaction.options.getBoolean("case-sensitive") ?? false,
			excludeChannels: interaction.options.getBoolean("excluir-canales") ?? false,
			deleteOriginalMessage: interaction.options.getBoolean("eliminar-mensaje") ?? false,
			regexFlags: interaction.options.getString("regex-flags"),
			channels: this.getChannelsFromOptions(interaction)
		}
	}

	private buildListEmbed (triggers: ITrigger[], verEliminados: boolean): EmbedBuilder {
		const titulo = verEliminados
			? `🗁️ Triggers eliminados (${triggers.length})`
			: `📋 Triggers del servidor (${triggers.length})`

		const embed = new EmbedBuilder()
			.setColor(verEliminados ? 0xff0000 : 0x0099ff)
			.setTitle(titulo)
			.setDescription("Selecciona un trigger del menú para ver sus detalles")

		if (triggers.length > 25) {
			embed.setFooter({ text: `Mostrando 25 de ${triggers.length}` })
		}

		return embed
	}

	private buildSelectMenuOptions (triggers: ITrigger[], verEliminados: boolean): StringSelectMenuOptionBuilder[] {
		return triggers.slice(0, 25).map((t) => {
			const triggerId = t._id.toString().slice(-6)
			const channelInfo = t.channels.length > 0
				? `📍${t.channels.length} canal${t.channels.length > 1 ? "es" : ""}`
				: "🌐 Todos"

			let label: string
			if (verEliminados && t.deletedAt) {
				const fecha = new Date(t.deletedAt).toLocaleDateString("es-ES")
				label = `[${fecha}] ${t.trigger.substring(0, 60)}`
			} else {
				label = `${t.trigger.substring(0, 80)}`
			}

			return new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(`${channelInfo} | ID: ${triggerId} | ${t.response.substring(0, 60)}`)
				.setValue(t._id.toString())
		})
	}

	private buildSelectMenuRow (
		triggers: ITrigger[],
		verEliminados: boolean
	): ActionRowBuilder<StringSelectMenuBuilder> {
		const options = this.buildSelectMenuOptions(triggers, verEliminados)
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("trigger_select")
			.setPlaceholder("Selecciona un trigger...")
			.addOptions(options)

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
	}

	// Funciones que van a ser usadas por los comandos slash
	async crear (options: Options & { guildId: string, userId: string }): Promise<CommandReply> {
		try {
			const duplicate = await this.checkDuplicateTrigger(
				options.guildId,
				options.triggerText,
				options.caseSensitive
			)
			if (duplicate) {
				return { content: `❌ Ya existe un trigger similar: \`${duplicate}\`` }
			}

			const trigger = await this.repository.createTriggerRecordDb(options.guildId, options.userId, options)

			triggerLogger.info(`Trigger creado: ${options.triggerText} en guild ${options.guildId}`)

			const embed = this.buildTriggerEmbed({
				trigger,
				matchType: options.matchType,
				caseSensitive: options.caseSensitive,
				channels: options.channels,
				excludeChannels: options.excludeChannels
			})

			return { embeds: [embed] }
		} catch (error) {
			triggerLogger.error("Error al crear trigger:", error)
			return { content: "❌ Error al crear el trigger. Inténtalo de nuevo." }
		}
	}

	async info (guildId: string, verEliminados: boolean): Promise<CommandReply> {
		try {
			const triggers = await this.repository.findByGuildDb(
				guildId,
				verEliminados
			)

			if (triggers.length === 0) {
				const mensaje = verEliminados
					? "🗁️ No hay triggers eliminados en este servidor."
					: "📋 No hay triggers configurados en este servidor."
				return { content: mensaje }
			}

			const embed = this.buildListEmbed(triggers, verEliminados)
			const row = this.buildSelectMenuRow(triggers, verEliminados)

			return {
				embeds: [embed],
				components: [row]
			}
		} catch (error) {
			triggerLogger.error("Error al listar triggers:", error)
			return { content: "❌ Error al listar los triggers." }
		}
	}

	async eliminar (triggerId: string, guildId: string, user: User): Promise<CommandReply> {
		try {
			const trigger = await this.repository.softDeleteTriggerDb(triggerId, guildId, user.id)

			if (!trigger) {
				return { content: `❌ No se encontró un trigger activo con el ID \`${triggerId}\`` }
			}

			const log = `Trigger eliminado (soft): ${trigger.trigger}` +
					` (${triggerId}) por ${user.tag}` +
					` en guild ${guildId}`
			triggerLogger.info(log)

			return {
				content: `✅ Trigger \`${trigger.trigger}\` eliminado correctamente.`
			}
		} catch (error) {
			triggerLogger.error("Error al eliminar trigger:", error)
			return { content: "❌ Error al eliminar el trigger." }
		}
	}
}
