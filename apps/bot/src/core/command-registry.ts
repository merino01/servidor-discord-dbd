import { Client, Collection } from "discord.js"
import { ICommand } from "@types"
import { getRegisteredCommands } from "./decorators/command.decorators"
import { botLogger } from "@core/logger"

/**
 * Registro de comandos del bot
 */
export class CommandRegistry {
	private commands: Collection<string, ICommand>
	private client: Client

	constructor (client: Client) {
		this.commands = new Collection()
		this.client = client
	}

	/**
   * Registra un comando en el registro
   */
	register (command: ICommand): void {
		this.commands.set(command.data.name, command)
	}

	/**
   * Obtiene un comando por su nombre
   */
	get (name: string): ICommand | undefined {
		return this.commands.get(name)
	}

	/**
   * Obtiene todos los comandos registrados
   */
	getAll (): ICommand[] {
		return Array.from(this.commands.values())
	}

	/**
   * Carga todos los comandos desde el registro global de decoradores
   */
	loadCommands (): void {
		botLogger.info("Cargando comandos del registro...")

		const registeredCommands = getRegisteredCommands()

		for (const [name, CommandClass] of registeredCommands) {
			try {
				const command = new CommandClass()
				this.register(command)
			} catch (error) {
				botLogger.error(`Error instanciando comando ${name}: `, error)
			}
		}

		botLogger.info(`${this.commands.size} comandos cargados`)
	}

	/**
   * Registra todos los comandos en Discord (deployment)
   */
	async deployCommands (guildId?: string): Promise<void> {
		const commands = this.getAll().map((cmd) => cmd.data.toJSON())

		try {
			botLogger.info("Desplegando comandos en Discord...")

			if (guildId) {
				// Registrar en un guild específico (más rápido para desarrollo)
				await this.client.application?.commands.set(commands, guildId)
				botLogger.info(`Comandos desplegados en el guild ${guildId}`)
			} else {
				// Registrar globalmente (tarda hasta 1 hora en propagarse)
				await this.client.application?.commands.set(commands)
				botLogger.info("Comandos desplegados globalmente")
			}
		} catch (error) {
			botLogger.error("Error desplegando comandos: ", error)
		}
	}
}
