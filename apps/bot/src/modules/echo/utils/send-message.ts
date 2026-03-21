import { EmbedBuilder, TextChannel } from "discord.js"
import { parseEmbed } from "./embed"

export async function sendMessage (
	channel: TextChannel,
	message?: string | null,
	embedJson?: string | null
): Promise<{ success: boolean; error?: string }> {
	const messagePayload: { content?: string; embeds?: EmbedBuilder[] } = {}

	if (message) {
		messagePayload.content = message
	}

	if (embedJson) {
		const { embed, error } = parseEmbed(embedJson)
		if (error) {
			return { success: false, error }
		}
		messagePayload.embeds = [embed]
	}

	try {
		await channel.send(messagePayload)
		return { success: true }
	} catch {
		return {
			success: false,
			error: "❌ Error al enviar el mensaje. Verifica los permisos del bot en ese canal."
		}
	}
}
