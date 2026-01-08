import {
	SlashCommandOptions,
	SubCommandOptions
} from "@types"
import { logger } from "@org/logger"

// Registro global de comandos
const commandRegistry = new Map<string, any>()

/**
 * Obtiene todos los comandos registrados
 */
export function getRegisteredCommands (): Map<string, any> {
	return commandRegistry
}

/**
 * Registra un comando en el registro global
 */
export function registerCommand (CommandClass: any, options: SlashCommandOptions): void {
	// Guardar metadata en la clase
	CommandClass.__commandOptions = options

	// Registrar en el Map global
	commandRegistry.set(options.name, CommandClass)

	logger.info(`Comando registrado: /${options.name}`)
}

/**
 * Registra un subcomando
 */
export function registerSubCommand (target: any, methodName: string, options: SubCommandOptions): void {
	if (!target.constructor.__subCommands) {
		target.constructor.__subCommands = []
	}

	target.constructor.__subCommands.push({
		name: options.name,
		description: options.description,
		methodName
	})
}

/**
 * Obtiene las opciones del comando
 */
export function getCommandMetadata (target: any): SlashCommandOptions | undefined {
	return target.__commandOptions
}

/**
 * Obtiene los subcomandos
 */
export function getSubCommandsMetadata (target: any): any[] {
	return target.__subCommands || []
}
