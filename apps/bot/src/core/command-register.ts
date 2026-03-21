import { SlashCommandBuilder, MessageFlags, InteractionContextType } from "discord.js"
import {
	SlashCommandOptions,
	SubCommandOptions,
	SubCommandGroupOptions,
	CommandContext
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

// ---------------------------------------------------------------------------
// Builder y executor — sustituyen la lógica de BaseCommand
// ---------------------------------------------------------------------------

function addOption (target: any, option: any): void {
	switch (option.type) {
	case 3: // STRING
		target.addStringOption((opt: any) => {
			opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			if (option.choices) { opt.addChoices(...option.choices) }
			return opt
		})
		break
	case 4: // INTEGER
		target.addIntegerOption((opt: any) => {
			opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			if (option.choices) { opt.addChoices(...option.choices) }
			return opt
		})
		break
	case 5: // BOOLEAN
		target.addBooleanOption((opt: any) => opt
			.setName(option.name)
			.setDescription(option.description)
			.setRequired(option.required ?? false)
		)
		break
	case 6: // USER
		target.addUserOption((opt: any) => opt
			.setName(option.name)
			.setDescription(option.description)
			.setRequired(option.required ?? false)
		)
		break
	case 7: // CHANNEL
		target.addChannelOption((opt: any) => {
			opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			if (option.channelTypes) {
				opt.addChannelTypes(...option.channelTypes)
			}
			return opt
		})
		break
	case 8: // ROLE
		target.addRoleOption((opt: any) => opt
			.setName(option.name)
			.setDescription(option.description)
			.setRequired(option.required ?? false)
		)
		break
	}
}

function addSubcommand (target: any, subcommand: any): void {
	target.addSubcommand((sub: any) => {
		sub.setName(subcommand.name).setDescription(subcommand.description)
		for (const option of (subcommand.options ?? [])) {
			addOption(sub, option)
		}
		return sub
	})
}

function buildSubcommands (data: SlashCommandBuilder, subcommands: any[], groups: any[]): void {
	if (groups.length === 0) {
		for (const subcommand of subcommands) {
			addSubcommand(data, subcommand)
		}
		return
	}

	for (const group of groups) {
		data.addSubcommandGroup((grp: any) => {
			grp.setName(group.name).setDescription(group.description)
			for (const sc of subcommands.filter((s) => s.group === group.name)) {
				addSubcommand(grp, sc)
			}
			return grp
		})
	}

	for (const sc of subcommands.filter((s) => !s.group)) {
		addSubcommand(data, sc)
	}
}

/**
 * Construye el SlashCommandBuilder de un comando a partir de sus metadatos.
 * Sustituye la lógica que antes vivía en el constructor de BaseCommand.
 */
export function buildCommandData (CommandClass: any): SlashCommandBuilder {
	const metadata = getCommandMetadata(CommandClass)

	if (!metadata) {
		throw new Error(`Command ${CommandClass.name} must be decorated with @SlashCommand()`)
	}

	const data = new SlashCommandBuilder()
		.setName(metadata.name)
		.setDescription(metadata.description)

	if (metadata.permissions) {
		data.setDefaultMemberPermissions(metadata.permissions)
	}

	// Lo limita solo a servidores si no se ha especificado explícitamente que no es guildOnly
	data.setContexts(metadata.guildOnly === false
		 ? [InteractionContextType.BotDM, InteractionContextType.Guild]
		 : [InteractionContextType.Guild])

	const subcommands = getSubCommandsMetadata(CommandClass)
	const groups = getSubCommandGroupsMetadata(CommandClass)

	if (subcommands.length > 0) {
		buildSubcommands(data, subcommands, groups)
	} else if (metadata.options?.length) {
		for (const option of metadata.options) {
			addOption(data, option)
		}
	}

	return data
}

/**
 * Ejecuta un comando enrutando al subcomando apropiado si existe.
 * Sustituye la lógica que antes vivía en BaseCommand.execute().
 */
export async function executeCommand (instance: any, context: CommandContext): Promise<void> {
	const { interaction } = context
	const subcommands = getSubCommandsMetadata(instance.constructor)
	const groups = getSubCommandGroupsMetadata(instance.constructor)

	if (subcommands.length === 0) {
		await instance.run(context)
		return
	}

	const subcommandName = interaction.options.getSubcommand()

	if (groups.length > 0) {
		const groupName = interaction.options.getSubcommandGroup(false)
		const subcommand = subcommands.find(
			(sc) => sc.name === subcommandName && (!groupName || sc.group === groupName)
		)

		if (!subcommand) {
			await interaction.reply({ content: "❌ Subcomando no encontrado.", flags: MessageFlags.Ephemeral })
			return
		}

		const method = instance[subcommand.methodName]
		if (typeof method === "function") { await method.call(instance, context) }
	} else {
		const subcommand = subcommands.find((sc) => sc.name === subcommandName)

		if (!subcommand) {
			await interaction.reply({ content: "❌ Subcomando no encontrado.", flags: MessageFlags.Ephemeral })
			return
		}

		const method = instance[subcommand.methodName]
		if (typeof method === "function") { await method.call(instance, context) }
	}
}
