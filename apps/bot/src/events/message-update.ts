import { Events, Message, PartialMessage } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"

/**
 * Evento global de messageUpdate
 * Se ejecuta cuando un mensaje es editado
 */
registerEvent(
	Events.MessageUpdate,
	async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
		if (newMessage.author?.bot) {return}

		botEvents.emit("message:edited", oldMessage, newMessage)
	})
