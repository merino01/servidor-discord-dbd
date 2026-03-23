import { botLogger } from "@/core/logger"
import { IWelcomeMessage, WelcomeMessageModel } from "@org/mongo"
import { EmbedBuilder, InteractionReplyOptions, MessageFlags } from "discord.js"
import { WelcomeMessageRepository } from "../repositories/welcome-message.repository"
import { Injectable } from "@/core/container"
import { CommandReply } from "@/core/types"
import { createMessage } from "../util/messages"

interface Options {
	enabled: boolean | null
	message: string | null
	embedString: string | null
	waitTime: number | null
}

interface ValidateOptions extends Options {
	guildId: string | null
}

const welcomeMessageLogger = botLogger.child("welcome-message")

@Injectable(WelcomeMessageRepository)
export class WelcomeMessageService {
	constructor (private readonly repository: WelcomeMessageRepository) {}

	async validateFields (
		{
			embedString,
			enabled,
			guildId,
			message,
			waitTime
		}: ValidateOptions): Promise<string | null> {
		let actualConfig: IWelcomeMessage | null

		try {
			actualConfig = await WelcomeMessageModel.findOne({
				guildId
			})
		} catch (error) {
			welcomeMessageLogger.error(error instanceof Error ? error.message : String(error))
			return "Ha ocurrido un error inesperado"
		}

		const firstTimeError = this.checkFirstTimeRequired(actualConfig, message, embedString)
		if (firstTimeError) { return firstTimeError }

		const provideError = this.checkProvideOrEdit(enabled, message, embedString, waitTime)
		if (provideError) { return provideError }

		return null
	}

	async updateConfig (options:  ValidateOptions): Promise<CommandReply> {
		const error = await this.validateFields(options)
		if (error) { return { content: error } }

		const config = await this.buildUpdate(options)
		if (config.error) { return { content: config.error } }

		try {
			const update = await this.repository.upsert(options.guildId!, config.newConfig)
			const embed = this.buildConfirmationEmbed(update.enabled, update.waitTime)

			return { embeds: [embed] }
		} catch (e) {
			welcomeMessageLogger.error("Error al actualizar la configuración de mensajes directos al unirse:", e)
			return  {
				content: "Ha ocurrido un error al actualizar la configuración. Por favor, inténtalo de nuevo más tarde."
			}
		}
	}

	async viewConfig (guildId: string): Promise<{
		reply: CommandReply,
		message?: InteractionReplyOptions
	}> {
		try {
			const config = await this.repository.findByGuild(guildId)
			if (!config) {
				return { reply:
					 { content: "No hay nada configurado, usa ``/welcome-message configurar`` para configurarlo" }
				}
			}

			const embed = this.buildConfirmationEmbed(config.enabled, config.waitTime)
			const example: InteractionReplyOptions = { ...createMessage(config), flags: MessageFlags.Ephemeral }
			return {
				reply: {
					embeds: [embed]
				},
				message: example
			}
		} catch (error) {
			welcomeMessageLogger.error(error instanceof Error ? error.message : String(error))
			return { reply: {
				content: "No hay nada configurado, usa ``/welcome-message configurar`` para configurarlo"
			}
			}
		}
	}

	async delete (guildId: string): Promise<CommandReply> {
		try {
			await this.repository.delete(guildId)
			return { content: "Configuración eliminada correctamente" }
		} catch (error) {
			welcomeMessageLogger.error("Error al eliminar la configuración:",
				error instanceof Error ? error.message : String(error))
			return { content: "Ha ocurrido un error" }
		}
	}

	private checkFirstTimeRequired (
		actualConfig: IWelcomeMessage | null,
		message: string | null,
		embedString: string | null
	): string | null {
		if (!actualConfig?.message && !actualConfig?.embed && !message && !embedString) {
			return "Debes proporcionar un mensaje o un embed por primera vez."
		}
		return null
	}

	private checkProvideOrEdit (
		enabled: boolean | null,
		message: string | null,
		embedString: string | null,
		waitTime: number | null
	): string | null {
		if (enabled === null && waitTime === null && !message && !embedString) {
			return "Debes proporcionar un mensaje, un embed o editar el estado."
		}
		return null
	}

	buildConfirmationEmbed (enabled: boolean, waitTime?: number | null): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(enabled ? 0x57f287 : 0xed4245)
			.setTitle("Enviar dm a nuevos miembros")
			.addFields(
				{
					name: "Estado",
					value: enabled ? "✅ Activado" : "❌ Desactivado",
					inline: true
				},
				{
					name: "Tiempo de espera",
					value: `${waitTime} ${waitTime === 1 ? "segundo" : "segundos"}`,
					inline: true
				}
			)

		return embed
	}

	private validateEmbed (embedString: string): { embed: EmbedBuilder, error: string | null } {
		try {
			const embedJSON = JSON.parse(embedString)
			const embed = new EmbedBuilder(embedJSON)
			return { embed, error: null }
		} catch (error) {
			welcomeMessageLogger.warn("Embed no válido proporcionado: ",
				 error instanceof Error
				  ? error.message
					: String(error))
			return {
				embed: new EmbedBuilder(),
				error:"El embed proporcionado no es un JSON válido."
			}
		}
	}

	async buildUpdate ({
		enabled,
		message,
		embedString,
		waitTime
	}: Options): Promise<{ newConfig: Partial<IWelcomeMessage>, error: string | null}> {

		const newConfig: Partial<IWelcomeMessage> = {}
		let error: string | null = null
		if (enabled !== null) { newConfig.enabled = enabled  }

		if (message) { newConfig.message = message }

		if (embedString) {
			const { embed: validatedEmbed, error: ValidationError } = this.validateEmbed(embedString)
			newConfig.embed = validatedEmbed.data
			error = ValidationError
		}

		if (waitTime !== null) {
			newConfig.waitTime = waitTime
		}

		return { newConfig, error }
	}
}
