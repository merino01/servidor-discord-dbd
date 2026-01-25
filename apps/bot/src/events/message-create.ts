import { Events, Message } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"

/**
 * Evento global de messageCreate
 * Este se ejecuta para todos los mensajes
 */
registerEvent(Events.MessageCreate, async (message: Message) => {
	if (message.author.bot) {return}

	botEvents.emit("message:created", message)
})
