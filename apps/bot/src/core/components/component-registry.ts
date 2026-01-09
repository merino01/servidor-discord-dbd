import type { ButtonHandler, SelectMenuHandler, ModalHandler } from "@types"
import { botLogger } from "@core/logger"

const componentLogger = botLogger.child("components")

// Registros globales
const buttonHandlers = new Map<string, ButtonHandler>()
const selectMenuHandlers = new Map<string, SelectMenuHandler>()
const modalHandlers = new Map<string, ModalHandler>()

/**
 * Registra un handler para un botón
 */
export function registerButton (customId: string, handler: ButtonHandler): void {
	buttonHandlers.set(customId, handler)
	componentLogger.debug(`Botón registrado: ${customId}`)
}

/**
 * Registra un handler para un select menu
 */
export function registerSelectMenu (customId: string, handler: SelectMenuHandler): void {
	selectMenuHandlers.set(customId, handler)
	componentLogger.debug(`Select menu registrado: ${customId}`)
}

/**
 * Registra un handler para un modal
 */
export function registerModal (customId: string, handler: ModalHandler): void {
	modalHandlers.set(customId, handler)
	componentLogger.debug(`Modal registrado: ${customId}`)
}

/**
 * Obtiene el handler de un botón
 */
export function getButtonHandler (customId: string): ButtonHandler | undefined {
	// Soporta custom IDs con parámetros (ej: trigger_delete_123)
	const baseId = customId.split("_").slice(0, 2).join("_")
	return buttonHandlers.get(customId) || buttonHandlers.get(baseId)
}

/**
 * Obtiene el handler de un select menu
 */
export function getSelectMenuHandler (customId: string): SelectMenuHandler | undefined {
	const baseId = customId.split("_").slice(0, 2).join("_")
	return selectMenuHandlers.get(customId) || selectMenuHandlers.get(baseId)
}

/**
 * Obtiene el handler de un modal
 */
export function getModalHandler (customId: string): ModalHandler | undefined {
	const baseId = customId.split("_").slice(0, 2).join("_")
	return modalHandlers.get(customId) || modalHandlers.get(baseId)
}
