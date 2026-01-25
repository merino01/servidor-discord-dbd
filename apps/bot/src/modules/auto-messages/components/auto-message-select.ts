import { registerSelectMenu } from "@/core/components/component-registry"
import { AutoMessageModel } from "@org/mongo"
import { StringSelectMenuInteraction } from "discord.js"
import { botLogger } from "@/core/logger"
import { buildAutoMessageInfoEmbed } from "../utils/embed-builder"

const autoMessageLogger = botLogger.child("auto-messages")

// Handler para cuando se selecciona un auto-mensaje del select menu
registerSelectMenu("auto_message_select", async (interaction: StringSelectMenuInteraction) => {
	const autoMessageId = interaction.values[0]

	try {
		const autoMessage = await AutoMessageModel.findById(autoMessageId)

		if (!autoMessage) {
			await interaction.update({
				content: "❌ No se encontró el mensaje automático seleccionado.",
				embeds: [],
				components: interaction.message.components
			})
			return
		}

		const originalEmbeds = interaction.message.embeds.slice(0, 1)
		const detailEmbed = buildAutoMessageInfoEmbed(autoMessage)

		await interaction.update({
			embeds: detailEmbed ? [detailEmbed] : originalEmbeds,
			components: interaction.message.components
		})
	} catch (error) {
		autoMessageLogger.error("Error al obtener detalles del mensaje automático:", error)
		await interaction.update({
			content: "❌ Error al obtener los detalles del mensaje automático.",
			embeds: interaction.message.embeds,
			components: interaction.message.components
		})
	}
})
