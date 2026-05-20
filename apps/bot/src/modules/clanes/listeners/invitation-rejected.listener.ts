import { botEvents } from "@/core/events/bot-events"
import { EmbedBuilder } from "discord.js"
import { BotInstance } from "@/core/bot-instance"

interface InvitationRejectedEvent {
	guildId: string
	clanId: string
	clanName: string
	invitedUserId: string
	invitedBy: string
	invitationId: string
}

export class InvitationRejectedListener {
	register () {
		/**
		* Listener para notificar al líder cuando se rechaza una invitación
		*/
		botEvents.on("clan:invitationRejected", async (data: InvitationRejectedEvent) => {
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
					.setColor(0xff9900)
					.setTitle("🚫 Invitación rechazada")
					.setDescription(
						`<@${data.invitedUserId}> ha rechazado tu invitación para unirse al clan **${data.clanName}**.`
					)
					.setTimestamp()

				await inviter.send({ embeds: [embed] }).catch(() => {
					// Silently fail if cannot send DM
				})
			} catch (error) {
				console.error("Error en listener de invitación rechazada:", error)
			}
		})
	}
}
