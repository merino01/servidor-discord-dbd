import { SlashCommandBuilder, MessageFlags } from "discord.js"
import {
	ICommand,
	CommandContext
} from "@types"
import {
	getCommandMetadata,
	getSubCommandsMetadata
} from "@core/decorators/command.decorators"

/**
 * Clase base para todos los comandos slash
 * Maneja automáticamente la construcción del comando y el enrutamiento de subcomandos
 */
export abstract class BaseCommand implements ICommand {
	public readonly data: SlashCommandBuilder

	constructor () {
		const metadata = getCommandMetadata(this.constructor)

		if (!metadata) {
			throw new Error(`Command ${this.constructor.name} must be registered with registerCommand()`)
		}

		this.data = new SlashCommandBuilder()
			.setName(metadata.name)
			.setDescription(metadata.description)

		// Configurar permisos si existen
		if (metadata.permissions) {
			this.data.setDefaultMemberPermissions(metadata.permissions)
		}

		// Agregar subcomandos automáticamente
		this.registerSubCommands()

		// Si no hay subcomandos, agregar opciones del comando principal
		const subcommands = getSubCommandsMetadata(this.constructor)
		if (subcommands.length === 0 && metadata.options) {
			this.registerCommandOptions(metadata.options)
		}
	}

	/**
   * Agrega opciones a un subcomando según su tipo
   */
	private addSubcommandOption (sub: any, option: any): void {
		switch (option.type) {
		case 3: // STRING
			sub.addStringOption((opt: any) => {
				opt.setName(option.name)
					.setDescription(option.description)
					.setRequired(option.required ?? false)
				if (option.choices) {
					opt.addChoices(...option.choices)
				}
				return opt
			})
			break
		case 4: // INTEGER
			sub.addIntegerOption((opt: any) => {
				opt.setName(option.name)
					.setDescription(option.description)
					.setRequired(option.required ?? false)
				if (option.choices) {
					opt.addChoices(...option.choices)
				}
				return opt
			})
			break
		case 5: // BOOLEAN
			sub.addBooleanOption((opt: any) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 6: // USER
			sub.addUserOption((opt: any) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 7: // CHANNEL
			sub.addChannelOption((opt: any) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 8: // ROLE
			sub.addRoleOption((opt: any) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		}
	}

	/**
   * Registra opciones del comando principal (para comandos sin subcomandos)
   */
	private registerCommandOptions (options: any[]): void {
		for (const option of options) {
			this.addCommandOption(option)
		}
	}

	/**
   * Agrega una opción al comando principal según su tipo
   */
	private addCommandOption (option: any): void {
		switch (option.type) {
		case 3: // STRING
			this.data.addStringOption((opt) => {
				opt.setName(option.name)
					.setDescription(option.description)
					.setRequired(option.required ?? false)
				if (option.choices) {
					opt.addChoices(...option.choices)
				}
				return opt
			})
			break
		case 4: // INTEGER
			this.data.addIntegerOption((opt) => {
				opt.setName(option.name)
					.setDescription(option.description)
					.setRequired(option.required ?? false)
				if (option.choices) {
					opt.addChoices(...option.choices)
				}
				return opt
			})
			break
		case 5: // BOOLEAN
			this.data.addBooleanOption((opt) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 6: // USER
			this.data.addUserOption((opt) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 7: // CHANNEL
			this.data.addChannelOption((opt) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		case 8: // ROLE
			this.data.addRoleOption((opt) => opt.setName(option.name)
				.setDescription(option.description)
				.setRequired(option.required ?? false)
			)
			break
		}
	}

	/**
   * Registra automáticamente todos los subcomandos
   */
	private registerSubCommands (): void {
		const subcommands = getSubCommandsMetadata(this.constructor)

		for (const subcommand of subcommands) {
			this.data.addSubcommand((sub) => {
				sub.setName(subcommand.name).setDescription(subcommand.description)

				// Agregar opciones si existen
				if (subcommand.options?.length) {
					for (const option of subcommand.options) {
						this.addSubcommandOption(sub, option)
					}
				}

				return sub
			})
		}
	}

	/**
   * Ejecuta el comando, enrutando al subcomando apropiado si existe
   */
	async execute (context: CommandContext): Promise<void> {
		const { interaction } = context
		const subcommands = getSubCommandsMetadata(this.constructor)

		if (subcommands.length === 0) {
			// No hay subcomandos, ejecutar el comando principal
			await this.run(context)
			return
		}

		// Enrutar al subcomando apropiado
		const subcommandName = interaction.options.getSubcommand()

		const subcommand = subcommands.find((sc) => sc.name === subcommandName)

		if (!subcommand) {
			await interaction.reply({
				content: "❌ Subcomando no encontrado.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		// Ejecutar el método del subcomando
		const method = (this as any)[subcommand.methodName]
		if (typeof method === "function") {
			await method.call(this, context)
		}
	}

	/**
   * Método que se ejecuta cuando el comando no tiene subcomandos
   * Las subclases deben implementarlo si es un comando simple
   */
	protected async run (context: CommandContext): Promise<void> {
		throw new Error("Method not implemented.")
	}
}
