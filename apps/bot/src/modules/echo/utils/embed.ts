import { EmbedBuilder } from "discord.js"

export function parseEmbed (embedJson: string): { embed: EmbedBuilder; error: string | null } {
	try {
		const parsed = JSON.parse(embedJson)
		const embed = new EmbedBuilder(parsed)
		return { embed, error: null }
	} catch {
		return {
			embed: new EmbedBuilder(),
			error: "❌ El JSON del embed es inválido. Asegúrate de que sea un JSON válido."
		}
	}
}

export function buildConfirmEmbed (
	channelId: string,
	username: string,
	hasEmbed: boolean
): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(0x00ff00)
		.setTitle("✅ Mensaje enviado")
		.addFields(
			{ name: "Canal", value: `<#${channelId}>`, inline: true },
			{ name: "Tipo", value: hasEmbed ? "Embed" : "Texto", inline: true }
		)
		.setFooter({ text: `Enviado por ${username}` })
		.setTimestamp()
}

export function buildErrorEmbed (channelId: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle("❌ Error")
		.setDescription(`Ha ocurrido un error al intentar enviarlo en <#${channelId}>`)
		.setTimestamp()
}
