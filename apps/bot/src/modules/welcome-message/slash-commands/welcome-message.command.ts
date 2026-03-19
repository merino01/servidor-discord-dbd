import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext } from "@/core/types"
import { IWelcomeMessage, WelcomeMessageModel } from "@org/mongo"
import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	InteractionReplyOptions,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { createMessage } from "../util/messages"

const welcomeMessageLogger = botLogger.child("welcome-message")

interface Options {
	enabled: boolean | null
	message: string | null
	embedString: string | null
	waitTime: number | null
}

interface ValidateOptions extends Options {
	guildId: string | null
}

export class WelcomeMessageCommand extends BaseCommand {

	public async configure (context: CommandContext) {
		const { interaction } = context
		const enabled = interaction.options.getBoolean("activar")
		const message = interaction.options.getString("mensaje")
		const embedString = interaction.options.getString("embed")
		const waitTime = interaction.options.getInteger("tiempo")

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const error = await this.validateFields({
			guildId: interaction.guild?.id ?? null,
			enabled,
			message,
			embedString,
			waitTime
		})

		if (error) {
			await interaction.editReply({
				content: error
			})
			return
		}

		const config = await this.buildUpdate({
			message,
			enabled,
			embedString,
			waitTime
		})

		if (config.error) {
			await interaction.editReply({ content: config.error })
			return
		}

		try {
			const update = await WelcomeMessageModel.findOneAndUpdate(
				{
					guildId: interaction.guild?.id
				},
				config.newConfig,
				{
					upsert: true, new: true
				}
			)
			await interaction.editReply({ embeds: [this.buildConfirmationEmbed(update.enabled, update.waitTime)] })
		} catch (e) {
			welcomeMessageLogger.error("Error al actualizar la configuración de mensajes directos al unirse:", e)
			await interaction.editReply({
				content: "Ha ocurrido un error al actualizar la configuración. Por favor, inténtalo de nuevo más tarde."
			})
		}

	}

	public async remove (context: CommandContext) {
		const { interaction } = context

		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})

		try {
			await WelcomeMessageModel.deleteOne({ guildId: interaction.guildId })
			await interaction.editReply({ content: "Configuración eliminada." })
		} catch (e) {
			welcomeMessageLogger.error("Error al eliminar la configuración:", e)
			await interaction.editReply({
				content: "Ha ocurrido un error al eliminar la configuración."
			})
		}
	}

	public async view ({ interaction }: CommandContext) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})
		try {
			const config = await WelcomeMessageModel.findOne({
				guildId: interaction.guild?.id ?? null
			})

			if (!config) {
				await interaction.editReply({
					content: "No hay nada configurado, usa ``/welcome-message configurar`` para configurarlo"
				})
				return
			}

			await interaction.editReply({
				content: "Configuración actual:",
				embeds: [this.buildConfirmationEmbed(config.enabled, config.waitTime)]
			})

			const message: InteractionReplyOptions = { ...createMessage(config), flags: MessageFlags.Ephemeral }
			await interaction.followUp(message)
		} catch (error) {
			await interaction.editReply({
				content: "Ha ocurrido un error inesperado."
			})
			welcomeMessageLogger.error(error instanceof Error ? error.message : String(error))
		}
	}

	private async validateFields (
		{
			embedString,
			enabled,
			guildId,
			message,
			waitTime
		}: ValidateOptions): Promise<string | null> {
		if (!guildId) {
			return "Este comando solo puede usarse dentro de un servidor servidor"
		}

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

	private buildConfirmationEmbed (enabled: boolean, waitTime?: number | null): EmbedBuilder {
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

	private async buildUpdate ({
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

registerCommand(WelcomeMessageCommand, {
	name: "welcome-message",
	description: "Mensajes que se envían al usuario al unirse al servidor",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})

registerSubCommand(WelcomeMessageCommand, "configure", {
	name: "configurar",
	description: "Configura el sistema de mensajes directos al unirse al servidor",
	options: [
		{
			name: "activar",
			description: "Activa o desactiva el sistema de mensajes directos. (Por defecto, desactivado)",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		},
		{
			name: "mensaje",
			description: "El mensaje que se enviará al usuario cuando se una",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "embed",
			description: "El embed que se enviará al usuario cuando se una (en formato JSON)",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "tiempo",
			description: "Tiempo de espera desde que se une hasta que se envía el mensaje (en segundos)",
			type: ApplicationCommandOptionType.Integer,
			required: false
		}
	]
})

registerSubCommand(WelcomeMessageCommand, "view", {
	name: "ver",
	description: "Muestra la configuración actual."
})

registerSubCommand(WelcomeMessageCommand, "remove", {
	name: "eliminar",
	description: "Elimina la configuración actual"
})

