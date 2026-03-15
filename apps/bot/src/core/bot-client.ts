import { ActivityType, Client, Events, GatewayIntentBits, MessageFlags } from "discord.js"
import { CommandRegistry } from "./command-registry"
import { getRegisteredEvents } from "./event-registry"
import { getButtonHandler, getSelectMenuHandler, getModalHandler } from "./components/component-registry"
import { CommandContext } from "@types"
import { botLogger } from "@core/logger"
import { botEvents } from "./events/bot-events"

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
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildVoiceStates
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
			botLogger.info(`Bot conectado como ${client.user.tag}`)
		})

		this.on(Events.InteractionCreate, async (interaction) => {
			if (interaction.isChatInputCommand()) {
				await this.handleCommand(interaction)
			} else if (interaction.isButton()) {
				await this.handleButton(interaction)
			} else if (interaction.isStringSelectMenu()) {
				await this.handleSelectMenu(interaction)
			} else if (interaction.isModalSubmit()) {
				await this.handleModal(interaction)
			}
		})
	}

	/**
   * Maneja la ejecución de comandos slash
   */
	private async handleCommand (interaction: any): Promise<void> {
		const command = this.commands.get(interaction.commandName)

		if (!command) {
			botLogger.warn(`Comando no encontrado: ${interaction.commandName}`)
			return
		}

		// Log automático de ejecución de comando
		const subcommand = interaction.options.getSubcommand?.(false)
		const commandPath = subcommand
			? `/${interaction.commandName} ${subcommand}`
			: `/${interaction.commandName}`

		// Extraer opciones para el log
		const options: Record<string, any> = {}
		interaction.options.data.forEach((option: any) => {
			if (option.type === 1 || option.type === 2) {
				// Subcomando o grupo de subcomandos - extraer sus opciones
				option.options?.forEach((subOption: any) => {
					options[subOption.name] = subOption.value
				})
			} else {
				// Opción directa
				options[option.name] = option.value
			}
		})

		const optionsStr = Object.keys(options).length > 0
			? ` | Opciones: ${JSON.stringify(options)}`
			: ""

		const userLog = `Usuario: ${interaction.user.tag} (${interaction.user.id})`
		const guildLog = interaction.guild
			? ` | Guild: ${interaction.guild.name} (${interaction.guild.id})`
			: " | DM"
		botLogger.info(
			`Comando ejecutado: ${commandPath} | ${userLog}${guildLog}${optionsStr}`
		)

		try {
			const context: CommandContext = { interaction }
			await command.execute(context)

			// Emitir evento de comando ejecutado
			botEvents.emit("command:executed", interaction, commandPath, options)
		} catch (error) {
			botLogger.error(`Error ejecutando comando ${interaction.commandName}: `, error)

			// Emitir evento de error
			botEvents.emit("command:error", interaction, error as Error)

			await this.replyError(interaction, "❌ Hubo un error ejecutando este comando.")
		}
	}

	/**
   * Maneja interacciones de botones
   */
	private async handleButton (interaction: any): Promise<void> {
		const handler = getButtonHandler(interaction.customId)

		if (!handler) {
			botLogger.warn(`Handler de botón no encontrado: ${interaction.customId}`)
			return
		}

		try {
			await handler(interaction)
		} catch (error) {
			botLogger.error(`Error en botón ${interaction.customId}: `, error)
			await this.replyError(interaction, "❌ Hubo un error procesando esta acción.")
		}
	}

	/**
   * Maneja interacciones de select menus
   */
	private async handleSelectMenu (interaction: any): Promise<void> {
		const handler = getSelectMenuHandler(interaction.customId)

		if (!handler) {
			botLogger.warn(`Handler de select menu no encontrado: ${interaction.customId}`)
			return
		}

		try {
			await handler(interaction)
		} catch (error) {
			botLogger.error(`Error en select menu ${interaction.customId}: `, error)
			await this.replyError(interaction, "❌ Hubo un error procesando esta selección.")
		}
	}

	/**
   * Maneja interacciones de modales
   */
	private async handleModal (interaction: any): Promise<void> {
		const handler = getModalHandler(interaction.customId)

		if (!handler) {
			botLogger.warn(`Handler de modal no encontrado: ${interaction.customId}`)
			return
		}

		try {
			await handler(interaction)
		} catch (error) {
			botLogger.error(`Error en modal ${interaction.customId}: `, error)
			await this.replyError(interaction, "❌ Hubo un error procesando este formulario.")
		}
	}

	/**
   * Responde con un mensaje de error a una interacción
   */
	private async replyError (interaction: any, message: string): Promise<void> {
		const errorMessage = { content: message, flags: MessageFlags.Ephemeral }

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(errorMessage)
		} else {
			await interaction.reply(errorMessage)
		}
	}

	/**
   * Registra todos los eventos personalizados
   */
	private registerCustomEvents (): void {
		const events = getRegisteredEvents()

		botLogger.info("Registrando eventos personalizados...")

		for (const event of events) {
			if (event.once) {
				this.once(event.name, async (...args) => {
					try {
						await event.handler(...args)
					} catch (error) {
						botLogger.error(`Error en evento ${event.name}:`, error)
					}
				})
			} else {
				this.on(event.name, async (...args) => {
					try {
						await event.handler(...args)
					} catch (error) {
						botLogger.error(`Error en evento ${event.name}: `, error)
					}
				})
			}
		}

		botLogger.info(`${events.length} eventos registrados`)
	}

	/**
 		* Establece el estado del bot
		*/

	private setPresence (): void {
		this.user?.setPresence({
			activities: [{
				name: "/stats ranking",
				type: ActivityType.Streaming,
			}]
		})
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

		// Establece el estado del bot
		this.setPresence()

		// Desplegar comandos en Discord
		if (guildId) {
			await this.commands.deployCommands(guildId)
		}
	}
}
