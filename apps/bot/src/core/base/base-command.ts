import { SlashCommandBuilder } from "discord.js"
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
	}

	/**
   * Registra automáticamente todos los subcomandos
   */
	private registerSubCommands (): void {
		const subcommands = getSubCommandsMetadata(this.constructor)

		for (const subcommand of subcommands) {
			this.data.addSubcommand((sub) => sub.setName(subcommand.name).setDescription(subcommand.description)
			)
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
				ephemeral: true
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
