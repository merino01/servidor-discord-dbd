import { Events, Message } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { logger } from "@org/logger"

/**
 * Evento global de messageCreate
 * Este se ejecuta para todos los mensajes
 */
registerEvent(Events.MessageCreate, async (message: Message) => {
	// Ignorar mensajes de bots
	if (message.author.bot) {return}

	// Aquí puedes agregar lógica global para todos los mensajes
	logger.info(`[Global] Mensaje de ${message.author.tag}: ${message.content}`)
})
