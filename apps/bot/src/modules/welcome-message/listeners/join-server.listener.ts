import { botEvents } from "@/core/events/bot-events"
import { botLogger } from "@/core/logger"
import { WelcomeMessageModel } from "@org/mongo"
import { GuildMember } from "discord.js"
import { createMessage } from "../util/messages"

const welcomeMessageListener = botLogger.child("welcome-message-listener")

botEvents.on("member:join", async (member: GuildMember) => {
	const config = await WelcomeMessageModel.findOne({ guildId: member.guild.id })
	if (!config || !config.enabled || !config.message && !config.embed) { return }

	try {
		const message = createMessage(config)

		if (config.waitTime) {
			setTimeout(async () => {
				await member.send(message)
			}, config.waitTime * 1000)
			return
		}

		await member.send(message)

	} catch (error) {
		welcomeMessageListener.error(`Error al enviar mensaje directo a ${member.user.tag} (${member.id}):`, error)
	}
})
