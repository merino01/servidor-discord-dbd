import { registerSelectMenu } from "@/core/components/component-registry"
import { AutoMessageModel, IAutoMessage, AutoMessageTargetType } from "@org/mongo"
import { EmbedBuilder, StringSelectMenuInteraction } from "discord.js"
import { botLogger } from "@/core/logger"

const autoMessageLogger = botLogger.child("auto-messages")

function addDeletionFields (embed: EmbedBuilder, autoMessage: IAutoMessage): void {
	if (!autoMessage.isActive && autoMessage.deletedBy && autoMessage.deletedAt) {
		embed.addFields(
			{ name: "Eliminado por", value: `<@${autoMessage.deletedBy}>`, inline: true },
			{ name: "Fecha de eliminación", value: autoMessage.deletedAt.toLocaleDateString("es-ES"), inline: true }
		)
	}
}

function buildAutoMessageDetailEmbed (autoMessage: IAutoMessage): EmbedBuilder {
	const targetInfo = autoMessage.targetType === AutoMessageTargetType.CHANNEL
		? `📍 Canal: <#${autoMessage.targetId}>`
		: `📁 Categoría: <#${autoMessage.targetId}>`

	const tipoInfo = autoMessage.cronExpression
		? `⏰ Programado (cron): \`${autoMessage.cronExpression}\``
		: "📝 Al crear canal"

	const embed = new EmbedBuilder()
		.setColor(autoMessage.isActive ? 0x0099ff : 0xff0000)
		.setTitle(`📨 ${autoMessage.name}`)
		.addFields(
			{ name: "Tipo", value: tipoInfo, inline: false },
			{ name: "Destino", value: targetInfo, inline: false },
			{
				name: "Mensaje",
				value: autoMessage.message ? autoMessage.message.substring(0, 1024) : "Embed solo",
				inline: false
			},
			{ name: "Ejecuciones", value: autoMessage.executionCount.toString(), inline: true },
			{ name: "Creado por", value: `<@${autoMessage.createdBy}>`, inline: true },
			{ name: "Fecha de creación", value: autoMessage.createdAt.toLocaleDateString("es-ES"), inline: true },
			{ name: "Activo", value: autoMessage.isActive ? "✅" : "❌", inline: true }
		)

	if (autoMessage.lastExecutionAt) {
		embed.addFields({
			name: "Última ejecución",
			value: `<t:${Math.floor(autoMessage.lastExecutionAt.getTime() / 1000)}:R>`,
			inline: true
		})
	}

	addDeletionFields(embed, autoMessage)

	embed.setFooter({ text: `ID: ${autoMessage._id}` })
	return embed
}

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
		const detailEmbed = buildAutoMessageDetailEmbed(autoMessage)

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
