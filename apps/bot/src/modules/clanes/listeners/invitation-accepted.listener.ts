import { botEvents } from "@/core/events/bot-events"
import { EmbedBuilder } from "discord.js"
import { BotInstance } from "@/core/bot-instance"

interface InvitationAcceptedEvent {
	guildId: string
	clanId: string
	clanName: string
	invitedUserId: string
	invitedBy: string
	invitationId: string
}

/**
 * Listener para notificar al líder cuando se acepta una invitación
 */
botEvents.on("clan:invitationAccepted", async (data: InvitationAcceptedEvent) => {
	try {
		const client = BotInstance.get()
		const guild = await client.guilds.fetch(data.guildId).catch(() => null)
		if (!guild) {
			return
		}

		const inviter = await guild.members.fetch(data.invitedBy).catch(() => null)
		if (!inviter) {
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle("✅ Invitación aceptada")
			.setDescription(
				`<@${data.invitedUserId}> ha aceptado tu invitación para unirse al clan **${data.clanName}**.`
			)
			.setTimestamp()

		await inviter.send({ embeds: [embed] }).catch(() => {
			// Silently fail if cannot send DM
		})
	} catch (error) {
		console.error("Error en listener de invitación aceptada:", error)
	}
})
