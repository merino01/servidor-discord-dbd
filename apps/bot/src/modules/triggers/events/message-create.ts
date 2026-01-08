import { Events, Message } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { logger } from "@org/logger"

/**
 * Evento messageCreate específico para el módulo de triggers
 * Este solo verifica triggers
 */
registerEvent(
	Events.MessageCreate,
	async (message: Message) => {
		// Ignorar mensajes de bots
		if (message.author.bot) {return}

		// Verificar si el mensaje contiene un trigger
		// Aquí llamarías a tu TriggerService para buscar triggers
		const content = message.content.toLowerCase()

		// Ejemplo simple - reemplazar con tu lógica real
		if (content.includes("hola")) {
			await message.reply("¡Hola! Este es un trigger de ejemplo.")
		}

		logger.info(`[Triggers] Verificando triggers para: ${message.content}`)
	},
	{
		module: "triggers"
	}
)
