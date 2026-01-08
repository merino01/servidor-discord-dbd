import { Client, Events, GatewayIntentBits } from "discord.js"
import { CommandRegistry } from "./command-registry"
import { getRegisteredEvents } from "./event-registry"
import { CommandContext } from "@types"
import { logger } from "@org/logger"

/**
 * Cliente principal del bot con gestión de comandos integrada
 */
export class BotClient extends Client {
	public readonly commands: CommandRegistry

	constructor () {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers
			]
		})

		this.commands = new CommandRegistry(this)
		this.setupEventHandlers()
	}

	/**
   * Configura los event handlers del bot
   */
	private setupEventHandlers (): void {
		this.once(Events.ClientReady, async (client) => {
			logger.info(`Bot conectado como ${client.user.tag}`)
		})

		this.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) {return}

			const command = this.commands.get(interaction.commandName)

			if (!command) {
				logger.warn(`Comando no encontrado: ${interaction.commandName}`)
				return
			}

			try {
				const context: CommandContext = {
					interaction
					// Aquí puedes agregar más contexto (db, cache, etc.)
				}

				await command.execute(context)
			} catch (error) {
				logger.error(`Error ejecutando comando ${interaction.commandName}: `, error)

				const errorMessage = {
					content: "❌ Hubo un error ejecutando este comando.",
					ephemeral: true
				}

				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage)
				} else {
					await interaction.reply(errorMessage)
				}
			}
		})
	}

	/**
   * Registra todos los eventos personalizados
   */
	private registerCustomEvents (): void {
		const events = getRegisteredEvents()

		logger.info("Registrando eventos personalizados...")

		for (const event of events) {
			if (event.once) {
				this.once(event.name, async (...args) => {
					try {
						await event.handler(...args)
					} catch (error) {
						logger.error(`Error en evento ${event.name}:`, error)
					}
				})
			} else {
				this.on(event.name, async (...args) => {
					try {
						await event.handler(...args)
					} catch (error) {
						logger.error(`Error en evento ${event.name}: `, error)
					}
				})
			}
		}

		logger.info(`${events.length} eventos registrados`)
	}

	/**
   * Inicializa el bot
   */
	async start (token: string, guildId?: string): Promise<void> {
		// Cargar comandos desde el registro global
		this.commands.loadCommands()

		// Registrar eventos personalizados
		this.registerCustomEvents()

		// Conectar al bot
		await this.login(token)

		// Desplegar comandos en Discord
		if (guildId) {
			await this.commands.deployCommands(guildId)
		}
	}
}
