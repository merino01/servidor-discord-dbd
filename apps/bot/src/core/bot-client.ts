import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js"
import { CommandRegistry } from "./command-registry"
import { getRegisteredEvents } from "./event-registry"
import { getButtonHandler, getSelectMenuHandler, getModalHandler } from "./components/component-registry"
import { CommandContext } from "@types"
import { botLogger } from "@core/logger"
import { botEvents } from "./events/bot-events"
import { reportBotError } from "@/modules/logs/services/error-reporter"

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

		const subcommand = interaction.options.getSubcommand?.(false)
		const commandPath = subcommand
			? `/${interaction.commandName} ${subcommand}`
			: `/${interaction.commandName}`

		const options: Record<string, any> = {}
		interaction.options.data.forEach((option: any) => {
			if (option.type === 1 || option.type === 2) {
				option.options?.forEach((subOption: any) => {
					options[subOption.name] = subOption.value
				})
			} else {
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
			botEvents.emit("command:executed", interaction, commandPath, options)
		} catch (error) {
			botLogger.error(`Error ejecutando comando ${interaction.commandName}: `, error)
			const contextInfo = `Comando: /${interaction.commandName} | `
				+ `Usuario: ${interaction.user.tag} (${interaction.user.id})`
			await this.reportInteractionError(
				interaction,
				error,
				"Error ejecutando comando",
				contextInfo
			)
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
			const contextInfo = `Custom ID: ${interaction.customId} | `
				+ `Usuario: ${interaction.user.tag} (${interaction.user.id})`
			await this.reportInteractionError(interaction, error, "Error en interacción de botón", contextInfo)
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
			const contextInfo = `Custom ID: ${interaction.customId} | `
				+ `Usuario: ${interaction.user.tag} (${interaction.user.id})`
			await this.reportInteractionError(interaction, error, "Error en interacción de select menu", contextInfo)
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
			const contextInfo = `Custom ID: ${interaction.customId} | `
				+ `Usuario: ${interaction.user.tag} (${interaction.user.id})`
			await this.reportInteractionError(interaction, error, "Error en interacción de modal", contextInfo)
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

	private getGuildIdFromEventArgs (args: any[]): string | undefined {
		for (const arg of args) {
			if (typeof arg?.guildId === "string") {
				return arg.guildId
			}
			if (typeof arg?.guild?.id === "string") {
				return arg.guild.id
			}
		}

		return undefined
	}

	private async reportInteractionError (
		interaction: any,
		error: unknown,
		title: string,
		context: string
	): Promise<void> {
		await reportBotError({
			error,
			title,
			guildId: interaction.guildId ?? undefined,
			context
		})
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
						await reportBotError({
							error,
							title: "Error en evento del bot",
							context: `Evento: ${event.name}`,
							guildId: this.getGuildIdFromEventArgs(args)
						})
					}
				})
			} else {
				this.on(event.name, async (...args) => {
					try {
						await event.handler(...args)
					} catch (error) {
						botLogger.error(`Error en evento ${event.name}: `, error)
						await reportBotError({
							error,
							title: "Error en evento del bot",
							context: `Evento: ${event.name}`,
							guildId: this.getGuildIdFromEventArgs(args)
						})
					}
				})
			}
		}

		botLogger.info(`${events.length} eventos registrados`)
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
