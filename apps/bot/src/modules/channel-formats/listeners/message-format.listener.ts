import { botEvents } from "@/core/events/bot-events"
import { ChannelFormatModel } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { Message, PartialMessage } from "discord.js"

const formatLogger = botLogger.child("channel-format")

interface ValidationResult {
	isValid: boolean
	format: {
		pattern: string
		flags: string
		deleteMessage: boolean
		notifyUser: boolean
	} | null
}

async function validateMessageFormat (message: Message | PartialMessage): Promise<ValidationResult> {
	if (!message.guild || !message.content) {
		return { isValid: true, format: null }
	}

	const format = await ChannelFormatModel.findOne({
		guildId: message.guild.id,
		channelId: message.channel.id
	})

	if (!format) {
		return { isValid: true, format: null }
	}

	try {
		const regex = new RegExp(format.pattern, format.flags)
		const isValid = regex.test(message.content)

		return {
			isValid,
			format: {
				pattern: format.pattern,
				flags: format.flags,
				deleteMessage: format.deleteMessage,
				notifyUser: format.notifyUser
			}
		}
	} catch (error) {
		formatLogger.error(`Error validando formato en canal ${message.channel.id}:`, error)
		return { isValid: true, format: null }
	}
}

async function handleInvalidMessage (message: Message, format: ValidationResult["format"]): Promise<void> {
	if (!format) {return}

	try {
		if (format.deleteMessage) {
			await message.delete()
			formatLogger.info(`Mensaje eliminado en ${message.channel.id} - no cumple formato`)
		}

		if (format.notifyUser && message.author) {
			const patternDisplay = `\`${format.pattern}\``
			const flagsDisplay = format.flags ? ` (flags: ${format.flags})` : ""

			await message.author.send(
				`⚠️ Tu mensaje en ${message.channel} fue eliminado porque no cumple con el formato requerido.\n\n` +
				`**Formato requerido:** ${patternDisplay}${flagsDisplay}`
			).catch((error) => {
				formatLogger.warn(`No se pudo notificar al usuario ${message.author?.id}:`, error)
			})
		}
	} catch (error) {
		formatLogger.error("Error manejando mensaje inválido:", error)
	}
}

// Listener para mensajes nuevos
botEvents.on("message:created", async (message: Message) => {
	if (message.author.bot) {return}

	const validation = await validateMessageFormat(message)

	if (!validation.isValid && validation.format) {
		await handleInvalidMessage(message, validation.format)
	}
})

// Listener para mensajes editados
botEvents.on("message:edited", async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
	if (newMessage.author?.bot) {return}
	if (!newMessage.content) {return}

	const validation = await validateMessageFormat(newMessage as Message)

	if (!validation.isValid && validation.format) {
		await handleInvalidMessage(newMessage as Message, validation.format)
	}
})

formatLogger.info("Listeners de formatos de canal iniciados")
