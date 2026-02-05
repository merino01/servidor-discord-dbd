import { botEvents } from "@/core/events/bot-events"
import { botLogger } from "@/core/logger"
import { JoinDmModel } from "@org/mongo"
import { EmbedBuilder, GuildMember } from "discord.js"

const joinDmlogger = botLogger.child("joinDmListener")

botEvents.on("member:join", async (member: GuildMember) => {
	const config = await JoinDmModel.findOne({ guildId: member.guild.id })
	if (!config || !config.enabled) {return}

	try {
		const embed = new EmbedBuilder(config?.embed || undefined)

		await member.send({
			content: config?.message || undefined,
			embeds: [embed]
		})

	} catch (error) {
		joinDmlogger.error(`Error al enviar mensaje directo a ${member.user.tag} (${member.id}):`, error)
	}
})
