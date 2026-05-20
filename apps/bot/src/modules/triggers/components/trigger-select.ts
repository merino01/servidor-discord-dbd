import { registerSelectMenu } from "@/core/components/component-registry"
import { TriggerModel, ITrigger } from "@org/mongo"
import { EmbedBuilder, StringSelectMenuInteraction, MessageFlags } from "discord.js"
import { logger } from "@org/logger"

const triggerLogger = logger.child("triggers")

const MATCH_TYPE_LABELS: Record<string, string> = {
	exact: "Exacto",
	contains: "Contiene",
	startsWith: "Empieza con",
	endsWith: "Termina con",
	word: "Palabra completa",
	regex: "Expresión regular"
}

export class triggerSelectComponent {
	private addDeletionFields (embed: EmbedBuilder, trigger: ITrigger): void {
		if (!trigger.isActive && trigger.deletedBy && trigger.deletedAt) {
			embed.addFields(
				{ name: "Eliminado por", value: `<@${trigger.deletedBy}>`, inline: true },
				{ name: "Fecha de eliminación", value: trigger.deletedAt.toLocaleDateString("es-ES"), inline: true }
			)
		}
	}

	private addChannelFields (embed: EmbedBuilder, trigger: ITrigger): void {
		if (trigger.channels.length > 0) {
			const channelText = trigger.channels.map((c) => `<#${c}>`).join(", ")
			const label = trigger.excludeChannels ? "🚫 Excluir canales" : "📍 Solo en canales"
			embed.addFields({ name: label, value: channelText, inline: false })
		}
	}

	private addRegexFields (embed: EmbedBuilder, trigger: ITrigger): void {
		if (trigger.matchType === "regex" && trigger.regexFlags) {
			embed.addFields({ name: "Regex Flags", value: trigger.regexFlags, inline: true })
		}
	}

	private buildTriggerDetailEmbed (trigger: ITrigger): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(trigger.isActive ? 0x0099ff : 0xff0000)
			.setTitle(`🎯 Trigger: ${trigger.trigger}`)
			.addFields(
				{ name: "Respuesta", value: trigger.response },
				{ name: "Tipo", value: MATCH_TYPE_LABELS[trigger.matchType] || trigger.matchType, inline: true },
				{ name: "Case Sensitive", value: trigger.caseSensitive ? "Sí" : "No", inline: true },
				{ name: "Eliminar mensaje", value: trigger.deleteOriginalMessage ? "Sí" : "No", inline: true },
				{ name: "Veces usado", value: trigger.usageCount.toString(), inline: true },
				{ name: "Creado por", value: `<@${trigger.createdBy}>`, inline: true },
				{ name: "Fecha de creación", value: trigger.createdAt.toLocaleDateString("es-ES"), inline: true },
				{ name: "Activo", value: trigger.isActive ? "✅" : "❌", inline: true }
			)

		this.addDeletionFields(embed, trigger)
		this.addChannelFields(embed, trigger)
		this.addRegexFields(embed, trigger)

		embed.setFooter({ text: `ID: ${trigger._id}` })
		return embed
	}

	// Handler para cuando se selecciona un trigger del select menu

	register (): void {
		registerSelectMenu("trigger_select", async (interaction: StringSelectMenuInteraction) => {
			const triggerId = interaction.values[0]

			try {
				const trigger = await TriggerModel.findById(triggerId)

				if (!trigger) {
					await interaction.reply({
						content: "❌ No se encontró el trigger seleccionado.",
						flags: MessageFlags.Ephemeral
					})
					return
				}

				const embed = this.buildTriggerDetailEmbed(trigger)

				await interaction.reply({
					embeds: [embed],
					flags: MessageFlags.Ephemeral
				})
			} catch (error) {
				triggerLogger.error("Error al obtener detalles del trigger:", error)
				await interaction.reply({
					content: "❌ Error al obtener los detalles del trigger.",
					flags: MessageFlags.Ephemeral
				})
			}
		})
	}
}
