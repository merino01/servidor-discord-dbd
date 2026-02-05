import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext, OptionType } from "@/core/types"
import { EmbedBuilder } from "@discordjs/builders"
import { JoinDmModel } from "@org/mongo"
import { APIEmbed, MessageFlags } from "discord.js"

const joinDmlogger = botLogger.child("joinDmCommand")

export class JoinDmCommand extends BaseCommand {
	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const enabled = interaction.options.getBoolean("activar") ?? true
		const message = interaction.options.getString("mensaje")
		const embedString = interaction.options.getString("embed")

		if (!message && !embedString) {
			await interaction.reply({
				content: "Debes proporcionar un mensaje o un embed.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		let embed: APIEmbed | null = null
		if (embedString) {
			const { embed: validatedEmbed, error } = this.validateEmbed(embedString)
			if (error) {
				await interaction.reply({
					content: error.message,
					flags: MessageFlags.Ephemeral
				})
				return
			}

			embed = validatedEmbed
		 }

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			await JoinDmModel.findOneAndUpdate(
				{
					guildId: interaction.guild!.id
				},
				{
					guildId: interaction.guild!.id,
					message,
					embed,
					enabled
				},
				{ upsert: true, new: true }
			)
			await interaction.editReply({
				embeds: [this.buildConfirmationEmbed(enabled)]
			})
		} catch (e) {
			joinDmlogger.error("Error al actualizar la configuración de mensajes directos al unirse:", e)
			await interaction.editReply({
				content: "Ha ocurrido un error al actualizar la configuración. Por favor, inténtalo de nuevo más tarde."
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

	private validateEmbed (embedString: string): { embed: APIEmbed | null, error: Error | null } {
		try {
			const embedJSON = JSON.parse(embedString)
			const embed = new EmbedBuilder(embedJSON).toJSON()

			return { embed, error: null }
		} catch (error) {
			joinDmlogger.warn("Embed no válido proporcionado: ", error instanceof Error ? error.message : String(error))
			return {
				embed: null,
				error: new Error("El embed proporcionado no es un JSON válido.")
			}
		}
	}
}

registerCommand(JoinDmCommand, {
	name: "join-dm",
	description: "Configura el sistema de mensajes directos al unirse al servidor",
	options: [
		{
			name: "activar",
			description: "Activa o desactiva el sistema de mensajes directos. (Por defecto, desactivado)",
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
		}
	]
})
