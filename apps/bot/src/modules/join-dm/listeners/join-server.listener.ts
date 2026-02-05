import { botEvents } from "@/core/events/bot-events"
import { botLogger } from "@/core/logger"
import { JoinDmModel } from "@org/mongo"
import { EmbedBuilder, GuildMember, MessageCreateOptions } from "discord.js"

const joinDmlogger = botLogger.child("joinDmListener")

botEvents.on("member:join", async (member: GuildMember) => {
	const config = await JoinDmModel.findOne({ guildId: member.guild.id })
	if (!config || !config.enabled) {return}

	try {
		const message: MessageCreateOptions = {}
		if (config.message) {
			message.content = config.message
		}
		if (config.embed) {
			message.embeds = [new EmbedBuilder(config.embed)]
		}

		await member.send(message)

	} catch (error) {
		joinDmlogger.error(`Error al enviar mensaje directo a ${member.user.tag} (${member.id}):`, error)
	}
})
