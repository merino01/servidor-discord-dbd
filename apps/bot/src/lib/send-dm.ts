import { BotInstance } from "@/core/bot-instance"
import { MessageCreateOptions } from "discord.js"

class UserNotFoundError extends Error {
	constructor (userId: string) {
		super(`Usuario con ID ${userId} no encontrado`)
		this.name = "UserNotFoundError"
	}
}

class BotNotInitializedError extends Error {
	constructor () {
		super("Bot no inicializado")
		this.name = "BotNotInitializedError"
	}
}

class DmNotSendableError extends Error {
	constructor (userId: string) {
		super(`No se puede enviar DM al usuario ${userId}`)
		this.name = "DmNotSendableError"
	}
}

export const sendDm = async (userId: string, message: MessageCreateOptions) => {
	const bot = BotInstance.getOrNull()
	if (!bot) {
		throw new BotNotInitializedError()
	}

	const user = await bot.users.fetch(userId)
	if (!user) {
		throw new UserNotFoundError(userId)
	}

	const dm = await user.createDM(true)
	if (!dm.isSendable()) {
		throw new DmNotSendableError(userId)
	}

	await dm.send(message)
}
