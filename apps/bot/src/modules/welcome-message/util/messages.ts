import { IWelcomeMessage } from "@org/mongo"
import { EmbedBuilder, MessageCreateOptions } from "discord.js"

export const createMessage = (config: IWelcomeMessage) : MessageCreateOptions => {
	const message: MessageCreateOptions = {}
	if (config.message) {
		message.content = config.message
	}
	if (config.embed) {
		message.embeds = [new EmbedBuilder(config.embed)]
	}

	return message
}
