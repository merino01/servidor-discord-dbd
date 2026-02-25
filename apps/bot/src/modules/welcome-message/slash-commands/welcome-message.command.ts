import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext, OptionType } from "@/core/types"
import { IWelcomeMessage, WelcomeMessageModel } from "@org/mongo"
import { CacheType, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js"

const welcomeMessageLogger = botLogger.child("welcome-message")

interface Options {
	enabled: boolean | null
	message: string | null
	embedString: string |null
}

export class WelcomeMessageCommand extends BaseCommand {
	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const enabled = interaction.options.getBoolean("activar")
		const message = interaction.options.getString("mensaje")
		const embedString = interaction.options.getString("embed")
		const remove = interaction.options.getBoolean("eliminar")

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (remove) {
			await this.handleRemove(interaction)
			return
		}

		if (enabled === null && !message && !embedString) {
			await interaction.editReply({
				content: "Debes proporcionar un mensaje, un embed o editar el estado"
			})
			return
		}

		const config = await this.buildUpdate({
			message,
			enabled,
			embedString
		})

		if (config.error) {
			await interaction.editReply({ content: config.error })
			return
		}

		try {
			const update = await WelcomeMessageModel.findOneAndUpdate(
				{
					guildId: interaction.guild?.id
				}
				, config.newConfig,
				{
					upsert: true, new: true
				}
			)
			await interaction.editReply({ embeds: [this.buildConfirmationEmbed(update.enabled)] })
		} catch (e) {
			welcomeMessageLogger.error("Error al actualizar la configuración de mensajes directos al unirse:", e)
			await interaction.editReply({
				content: "Ha ocurrido un error al actualizar la configuración. Por favor, inténtalo de nuevo más tarde."
			})
		}

	}

	private async handleRemove (interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
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

	private buildConfirmationEmbed (enabled: boolean): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(enabled ? 0x57f287 : 0xed4245)
			.setTitle("Enviar dm a nuevos miembros")
			.addFields(
				{
					name: "Estado",
					value: enabled ? "✅ Activado" : "❌ Desactivado",
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
		embedString
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

		return { newConfig, error }
	}

}

registerCommand(WelcomeMessageCommand, {
	name: "welcome-message",
	description: "Configura el sistema de mensajes directos al unirse al servidor",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true,
	options: [
		{
			name: "activar",
			description: "Activa o desactiva el sistema de mensajes directos. (Por defecto, activado)",
			type: OptionType.BOOLEAN,
			required: false
		},
		{
			name: "mensaje",
			description: "El mensaje que se enviará al usuario cuando se una",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "embed",
			description: "El embed que se enviará al usuario cuando se una (en formato JSON)",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "eliminar",
			description: "Elimina la configuración. Al activar esta opción se ignoran los demás parámetros.",
			type: OptionType.BOOLEAN,
			required: false
		}
	]
})
