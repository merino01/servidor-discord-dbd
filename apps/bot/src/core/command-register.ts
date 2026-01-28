import {
	SlashCommandOptions,
	SubCommandOptions,
	SubCommandGroupOptions
} from "@types"
import { botLogger } from "@core/logger"

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

	botLogger.info(`Comando registrado: /${options.name}`)
}

/**
 * Registra un grupo de subcomandos
 */
export function registerSubCommandGroup (
	CommandClass: any,
	options: SubCommandGroupOptions
): void {
	if (!CommandClass.__subCommandGroups) {
		CommandClass.__subCommandGroups = []
	}

	CommandClass.__subCommandGroups.push({
		name: options.name,
		description: options.description
	})
}

/**
 * Registra un subcomando (puede estar dentro de un grupo)
 */
export function registerSubCommand (
	CommandClass: any,
	methodName: string,
	options: SubCommandOptions & { group?: string }
): void {
	if (!CommandClass.__subCommands) {
		CommandClass.__subCommands = []
	}

	CommandClass.__subCommands.push({
		name: options.name,
		description: options.description,
		group: options.group,
		methodName,
		options: options.options || []
	})
}

/**
 * Obtiene las opciones del comando
 */
export function getCommandMetadata (target: any): SlashCommandOptions | undefined {
	return target.__commandOptions
}

/**
 * Obtiene los grupos de subcomandos
 */
export function getSubCommandGroupsMetadata (target: any): any[] {
	return target.__subCommandGroups || []
}

/**
 * Obtiene los subcomandos
 */
export function getSubCommandsMetadata (target: any): any[] {
	return target.__subCommands || []
}
