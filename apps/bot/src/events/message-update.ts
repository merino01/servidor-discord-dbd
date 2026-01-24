import { Events, Message, PartialMessage } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { botLogger } from "@core/logger"
import { botEvents } from "@/core/events/bot-events"

/**
 * Evento global de messageUpdate
 * Se ejecuta cuando un mensaje es editado
 */
registerEvent(
	Events.MessageUpdate,
	async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
	// Ignorar mensajes de bots
		if (newMessage.author?.bot) {return}

		// Emitir evento para otros módulos
		botEvents.emit("message:edited", oldMessage, newMessage)

		// Log opcional
		if (newMessage.content && oldMessage.content) {
			botLogger.info(`Mensaje editado por ${newMessage.author?.tag}`)
		}
	})
