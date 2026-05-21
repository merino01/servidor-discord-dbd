import { EmbedBuilder } from "discord.js"

export const buildErrorEmbed = (error: string): EmbedBuilder  => new EmbedBuilder()
	.setColor(0xff0000)
	.setTitle("❌ Error")
	.setDescription(error)
	.setTimestamp()

export const buildSuccessEmbed = (title: string, description: string): EmbedBuilder => new EmbedBuilder()
	.setColor(0x00ff00)
	.setTitle(`✅ ${title}`)
	.setDescription(description)
	.setTimestamp()
