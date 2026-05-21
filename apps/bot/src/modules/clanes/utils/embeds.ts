import { IClan } from "@org/mongo"
import { EmbedBuilder } from "discord.js"

export const buildMemberEmbed = (clan: IClan, chunks: string[][], page: number): EmbedBuilder  => new EmbedBuilder()
	.setColor(0x5865f2)
	.setTitle(`${clan.icon} Miembros de ${clan.name}`)
	.setDescription(chunks[page].join("\n"))
	.setFooter({
		text: `Página ${page + 1}/${chunks.length} • Total: ${clan.members.length} miembros`
	})
	.setTimestamp()

