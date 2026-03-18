/**
 * Decoradores para registrar comandos slash, subcomandos y grupos de subcomandos.
 *
 * Estos decoradores son una capa fina sobre las funciones de registro existentes
 * (`registerCommand`, `registerSubCommand`, `registerSubCommandGroup`) y NO
 * rompen el sistema actual. Los módulos ya existentes siguen funcionando igual.
 *
 * @example Comando simple
 * ```ts
 * @SlashCommand({ name: 'ping', description: 'Responde con pong' })
 * class PingCommand extends BaseCommand {
 *   protected async run(context: CommandContext) {
 *     await context.interaction.reply('Pong!')
 *   }
 * }
 * ```
 *
 * @example Comando con subcomandos
 * ```ts
 * @SlashCommand({ name: 'config', description: 'Configuración del servidor' })
 * class ConfigCommand extends BaseCommand {
 *   @Subcommand({ name: 'view', description: 'Ver configuración' })
 *   async view(context: CommandContext) { ... }
 *
 *   @Subcommand({ name: 'reset', description: 'Resetear configuración' })
 *   async reset(context: CommandContext) { ... }
 * }
 * ```
 *
 * @example Comando con grupos de subcomandos
 * ```ts
 * @SlashCommand({ name: 'admin', description: 'Comandos de administración' })
 * @SubcommandGroup({ name: 'users', description: 'Gestión de usuarios' })
 * @SubcommandGroup({ name: 'roles', description: 'Gestión de roles' })
 * class AdminCommand extends BaseCommand {
 *   @Subcommand({ name: 'ban', description: 'Banear usuario', group: 'users' })
 *   async banUser(context: CommandContext) { ... }
 *
 *   @Subcommand({ name: 'add', description: 'Añadir rol', group: 'roles' })
 *   async addRole(context: CommandContext) { ... }
 * }
 * ```
 */

import {
	registerCommand,
	registerSubCommand,
	registerSubCommandGroup
} from "@/core/command-register"
import {
	SlashCommandOptions,
	SubCommandOptions,
	SubCommandGroupOptions,
	CommandOption,
	OptionType
} from "@types"

// ---------------------------------------------------------------------------
// Almacenamiento interno de opciones por método
// Clave: prototype de la clase   Valor: Map<nombreMétodo, CommandOption[]>
// ---------------------------------------------------------------------------
const methodOptionsRegistry = new WeakMap<object, Map<string, CommandOption[]>>()

function getOrCreateMethodOptions (target: object, method: string): CommandOption[] {
	if (!methodOptionsRegistry.has(target)) {
		methodOptionsRegistry.set(target, new Map())
	}
	// get() never returns undefined: we just ensured the key exists above
	const classMap = methodOptionsRegistry.get(target) as Map<string, CommandOption[]>
	if (!classMap.has(method)) {
		classMap.set(method, [])
	}
	// Same: get() is safe after the has() check above
	return classMap.get(method) as CommandOption[]
}

/**
 * Decorador de clase. Registra el comando en el registry global y define
 * su nombre, descripción y permisos. Debe ir siempre en la clase.
 */
export function SlashCommand (options: SlashCommandOptions) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: any): void {
		// Recoge opciones declaradas con @XxxOption sobre el método `run`
		// (usado en comandos simples sin subcomandos)
		const runOpts = methodOptionsRegistry.get(target.prototype)?.get("run") ?? []
		const merged: SlashCommandOptions = {
			...options,
			options: [...runOpts, ...(options.options ?? [])]
		}
		registerCommand(target, merged)
	}
}

/**
 * Decorador de método. Registra el método como subcomando del comando padre.
 * Opcionalmente puede pertenecer a un `@SubcommandGroup` mediante la propiedad `group`.
 */
export function Subcommand (options: SubCommandOptions & { group?: string }) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: any, propertyKey: string): void {
		// Recoge opciones declaradas con @XxxOption sobre este método
		// Los decoradores se ejecutan de abajo hacia arriba, unshift los reordena al orden visual
		const decoratorOpts = methodOptionsRegistry.get(target)?.get(propertyKey) ?? []
		const merged: SubCommandOptions & { group?: string } = {
			...options,
			options: [...decoratorOpts, ...(options.options ?? [])]
		}
		registerSubCommand(target.constructor, propertyKey, merged)
	}
}

/**
 * Decorador de clase. Declara un grupo de subcomandos en el comando.
 * Puede apilarse múltiples veces para registrar varios grupos.
 * Los subcomandos se asocian al grupo a través de la propiedad `group` en `@Subcommand`.
 */
export function SubcommandGroup (options: SubCommandGroupOptions) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: any): void {
		registerSubCommandGroup(target, options)
	}
}

// ===========================================================================
// Decoradores de opciones
// Se apilan encima del método (o del `run`). Cada uno añade una opción tipada.
// El orden visual (top → bottom) = el orden que ve el usuario en Discord.
// ===========================================================================

/** Metadatos comunes a todas las opciones */
export interface BaseOptionMeta {
	name: string
	description: string
	required?: boolean
}

/** Opción de tipo cadena de texto */
export interface StringOptionMeta extends BaseOptionMeta {
	choices?: Array<{ name: string; value: string }>
}

/** Opción de tipo número entero o decimal */
export interface NumberOptionMeta extends BaseOptionMeta {
	choices?: Array<{ name: string; value: number }>
}

type OptionChoiceMeta = BaseOptionMeta & { choices?: Array<{ name: string; value: string | number }> }

function createOptionDecorator (type: OptionType, meta: OptionChoiceMeta) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: any, propertyKey: string): void {
		const opts = getOrCreateMethodOptions(target, propertyKey)
		// unshift para que el orden en el array coincida con el orden visual del código
		opts.unshift({ type, ...meta })
	}
}

/**
 * Agrega una opción de tipo `STRING` al comando o subcomando.
 * @example
 * ```ts
 * @Subcommand({ name: 'echo', description: 'Repite un texto' })
 * @StringOption({ name: 'texto', description: 'Texto a repetir', required: true })
 * async echo(ctx: CommandContext) {
 *   const texto = ctx.interaction.options.getString('texto', true)
 * }
 * ```
 */
export function StringOption (meta: StringOptionMeta) {
	return createOptionDecorator(OptionType.STRING, meta)
}

/**
 * Agrega una opción de tipo `INTEGER` al comando o subcomando.
 */
export function IntegerOption (meta: NumberOptionMeta) {
	return createOptionDecorator(OptionType.INTEGER, meta)
}

/**
 * Agrega una opción de tipo `NUMBER` (decimal) al comando o subcomando.
 */
export function NumberOption (meta: NumberOptionMeta) {
	return createOptionDecorator(OptionType.NUMBER, meta)
}

/**
 * Agrega una opción de tipo `BOOLEAN` al comando o subcomando.
 */
export function BooleanOption (meta: BaseOptionMeta) {
	return createOptionDecorator(OptionType.BOOLEAN, meta)
}

/**
 * Agrega una opción de tipo `USER` al comando o subcomando.
 */
export function UserOption (meta: BaseOptionMeta) {
	return createOptionDecorator(OptionType.USER, meta)
}

/**
 * Agrega una opción de tipo `CHANNEL` al comando o subcomando.
 */
export function ChannelOption (meta: BaseOptionMeta) {
	return createOptionDecorator(OptionType.CHANNEL, meta)
}

/**
 * Agrega una opción de tipo `ROLE` al comando o subcomando.
 */
export function RoleOption (meta: BaseOptionMeta) {
	return createOptionDecorator(OptionType.ROLE, meta)
}
