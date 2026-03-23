import { botEvents } from "@/core/events/bot-events"
import { botLogger } from "@/core/logger"
import { WelcomeMessageModel } from "@org/mongo"
import { GuildMember } from "discord.js"
import { createMessage } from "../util/messages"

const welcomeMessageLogger = botLogger.child("welcome-message-listener")

export class WelcomeMessageListener {
	 async register (): Promise<void> {
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
				welcomeMessageLogger.error(
					`Error al enviar mensaje directo a ${member.user.tag} (${member.id}):`, error
				)
			}
		})
	}
}
