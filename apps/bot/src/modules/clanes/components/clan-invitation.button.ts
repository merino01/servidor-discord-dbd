import { ButtonInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js"
import { registerButton } from "@/core/components/component-registry"
import { ClanService } from "../services/clan.service"

const clanService = ClanService.getInstance()

function buildDisabledButtons (): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("clan_invitation_accept_disabled")
			.setLabel("Aceptar")
			.setStyle(ButtonStyle.Success)
			.setDisabled(true),
		new ButtonBuilder()
			.setCustomId("clan_invitation_reject_disabled")
			.setLabel("Rechazar")
			.setStyle(ButtonStyle.Danger)
			.setDisabled(true)
	)
}

async function handleAccept (interaction: ButtonInteraction, invitationId: string): Promise<void> {
	const processingEmbed = new EmbedBuilder()
		.setColor(0x5865f2)
		.setTitle("⏳ Procesando...")
		.setDescription("Aceptando tu invitación al clan, por favor espera...")
		.setTimestamp()

	await interaction.update({
		embeds: [processingEmbed],
		components: [buildDisabledButtons()]
	})

	const result = await clanService.acceptInvitation(invitationId)

	if (result.success) {
		const successEmbed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Invitación aceptada")
			.setDescription("Has aceptado la invitación y ahora eres parte del clan.")
			.setTimestamp()

		await interaction.editReply({
			embeds: [successEmbed],
			components: [buildDisabledButtons()]
		})
	} else {
		const errorEmbed = new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("❌ Error")
			.setDescription(result.error || "No se pudo aceptar la invitación")
			.setTimestamp()

		await interaction.editReply({ embeds: [errorEmbed], components: [] })
	}
}

async function handleReject (interaction: ButtonInteraction, invitationId: string): Promise<void> {
	await interaction.deferUpdate()

	const result = await clanService.rejectInvitation(invitationId)

	if (result.success) {
		const successEmbed = new EmbedBuilder()
			.setColor(0xff9900)
			.setTitle("🚫 Invitación rechazada")
			.setDescription("Has rechazado la invitación al clan.")
			.setTimestamp()

		await interaction.editReply({
			embeds: [successEmbed],
			components: [buildDisabledButtons()]
		})
	} else {
		const errorEmbed = new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("❌ Error")
			.setDescription(result.error || "No se pudo rechazar la invitación")
			.setTimestamp()

		await interaction.editReply({ embeds: [errorEmbed], components: [] })
	}
}

/**
 * Handler para botones de invitación a clan (aceptar y rechazar)
 * CustomId format: clan_invitation_accept_{invitationId} o clan_invitation_reject_{invitationId}
 */
registerButton("clan_invitation", async (interaction: ButtonInteraction) => {
	const parts = interaction.customId.split("_")
	if (parts.length < 4) {
		return
	}

	const action = parts[2]
	const invitationId = parts.slice(3).join("_")

	if (action === "accept") {
		await handleAccept(interaction, invitationId)
	} else if (action === "reject") {
		await handleReject(interaction, invitationId)
	}
})

