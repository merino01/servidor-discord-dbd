import { ClientEvents } from "discord.js"
import { EventHandler, EventMetadata } from "@types"
import { logger } from "@org/logger"

// Registro global de eventos
const eventRegistry: EventMetadata[] = []

/**
 * Registra un handler de evento
 */
export function registerEvent<K extends keyof ClientEvents> (
	eventName: K,
	handler: EventHandler<K>,
	options?: {
    once?: boolean;
    module?: string;
  }
): void {
	eventRegistry.push({
		name: eventName,
		handler: handler as any,
		once: options?.once,
		module: options?.module
	})

	const modulePrefix = options?.module ? `[${options.module}] ` : ""
	logger.info(`Evento registrado: ${modulePrefix}${eventName}`)
}

/**
 * Obtiene todos los eventos registrados
 */
export function getRegisteredEvents (): EventMetadata[] {
	return eventRegistry
}
