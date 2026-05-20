import { registerSelectMenu } from "@/core/components/component-registry"
import { ClanModel, IClan } from "@org/mongo"
import { EmbedBuilder, StringSelectMenuInteraction, MessageFlags } from "discord.js"
import { logger } from "@org/logger"

const clanLogger = logger.child("clanes")

export class ClanSelectButton {
	private buildClanDetailEmbed (clan: IClan): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle(`Detalles del Clan: ${clan.name}`)
			.setColor(0x3498db)
			.addFields(
				{ name: "Nombre", value: clan.name, inline: true },
				{ name: "Líderes", value: clan.leaderIds.map((leader) => `<@${leader}>`).join(", "), inline: true },
				{ name: "Miembros", value: String(clan.members.length), inline: true },
				{ name: "Creado el", value: `<t:${Math.floor(clan.createdAt.getTime() / 1000)}:R>`, inline: true },
				{ name: "Creado por", value: `<@${clan.createdBy}>`, inline: true },
				{
					name: "Canales de texto",
					value: clan.textChannelIds.map((channel) => `<#${channel}>`).join(", "),
					inline: false
				},
				{
					name: "Canales de voz",
					value: clan.voiceChannelIds.map((channel) => `<#${channel}>`).join(", "),
					inline: false
				}
			)

		embed.setFooter({ text: `ID: ${clan._id}` })
		return embed
	}

	register () {
		registerSelectMenu("clan_select", async (interaction: StringSelectMenuInteraction) => {
			const clanId = interaction.values[0]

			try {
				const clan = await ClanModel.findById(clanId)

				if (!clan) {
					await interaction.reply({
						content: "❌ No se encontró el clan seleccionado.",
						flags: MessageFlags.Ephemeral
					})
					return
				}

				const embed = this.buildClanDetailEmbed(clan)

				await interaction.reply({
					embeds: [embed],
					flags: MessageFlags.Ephemeral
				})
			} catch (error) {
				clanLogger.error("Error al obtener detalles del clan:", error)
				await interaction.reply({
					content: "❌ Error al obtener los detalles del clan.",
					flags: MessageFlags.Ephemeral
				})
			}
		})
	}
}
