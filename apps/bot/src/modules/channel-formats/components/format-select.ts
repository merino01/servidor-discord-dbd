import { registerSelectMenu } from "@/core/components/component-registry"
import { ChannelFormatModel, IChannelFormat } from "@org/mongo"
import { EmbedBuilder, StringSelectMenuInteraction } from "discord.js"
import { botLogger } from "@/core/logger"

const formatLogger = botLogger.child("channel-format")

function getFormatStatus (format: IChannelFormat): { text: string; color: number } {
	if (format.deletedAt) {
		return { text: "🗑️ Eliminado", color: 0xff0000 }
	}
	if (!format.isActive) {
		return { text: "⏸️ Pausado", color: 0xffa500 }
	}
	return { text: "✅ Activo", color: 0x00ff00 }
}

function addDeletionFields (embed: EmbedBuilder, format: IChannelFormat): void {
	if (!format.isActive && format.deletedBy && format.deletedAt) {
		embed.addFields(
			{ name: "Eliminado por", value: `<@${format.deletedBy}>`, inline: true },
			{
				name: "Fecha de eliminación",
				value: `<t:${Math.floor(format.deletedAt.getTime() / 1000)}:R>`,
				inline: true
			}
		)
	}
}

function buildFormatDetailEmbed (format: IChannelFormat): EmbedBuilder {
	const options = []
	if (format.deleteMessage) {options.push("Elimina mensajes inválidos")}
	if (format.notifyUser) {options.push("Notifica al usuario")}

	const status = getFormatStatus(format)

	const embed = new EmbedBuilder()
		.setColor(status.color)
		.setTitle(`⚙️ ${format.name}`)
		.addFields(
			{ name: "Estado", value: status.text, inline: true },
			{ name: "Canal", value: `<#${format.channelId}>`, inline: true },
			{ name: "Patrón", value: `\`${format.pattern}\``, inline: true },
			{ name: "Flags", value: format.flags || "ninguno", inline: true },
			{ name: "Opciones", value: options.join("\n") || "Ninguna", inline: false }
		)

	if (format.createdAt) {
		embed.addFields({
			name: "Fecha de creación",
			value: `<t:${Math.floor(format.createdAt.getTime() / 1000)}:R>`,
			inline: true
		})
	}

	if (format.updatedAt) {
		embed.addFields({
			name: "Última actualización",
			value: `<t:${Math.floor(format.updatedAt.getTime() / 1000)}:R>`,
			inline: true
		})
	}

	addDeletionFields(embed, format)

	embed.setFooter({ text: `ID: ${format._id}` })
	return embed
}

// Handler para cuando se selecciona un formato del select menu
registerSelectMenu("format_select", async (interaction: StringSelectMenuInteraction) => {
	const formatId = interaction.values[0]

	try {
		const format = await ChannelFormatModel.findById(formatId)

		if (!format) {
			await interaction.update({
				content: "❌ No se encontró el formato seleccionado.",
				embeds: [],
				components: interaction.message.components
			})
			return
		}

		const detailEmbed = buildFormatDetailEmbed(format)

		await interaction.update({
			embeds: [detailEmbed],
			components: interaction.message.components
		})
	} catch (error) {
		formatLogger.error("Error al obtener detalles del formato:", error)
		await interaction.update({
			content: "❌ Error al obtener los detalles del formato.",
			embeds: interaction.message.embeds,
			components: interaction.message.components
		})
	}
})
