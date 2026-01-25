import { Events, Message, PartialMessage } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"

/**
 * Evento global de messageDelete
 * Se ejecuta cuando un mensaje es eliminado
 */
registerEvent(
	Events.MessageDelete,
	async (message: Message | PartialMessage) => {
		if (message.author?.bot) {return}

		botEvents.emit("message:deleted", message as Message)
	})
