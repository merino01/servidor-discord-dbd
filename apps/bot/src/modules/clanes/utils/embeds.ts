import { IClan } from "@org/mongo"
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

export const buildMemberEmbed = (clan: IClan, chunks: string[][], page: number): EmbedBuilder  => new EmbedBuilder()
	.setColor(0x5865f2)
	.setTitle(`${clan.icon} Miembros de ${clan.name}`)
	.setDescription(chunks[page].join("\n"))
	.setFooter({
		text: `Página ${page + 1}/${chunks.length} • Total: ${clan.members.length} miembros`
	})
	.setTimestamp()

