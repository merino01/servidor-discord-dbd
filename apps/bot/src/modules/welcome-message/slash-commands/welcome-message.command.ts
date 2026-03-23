import { CommandContext } from "@/core/types"
import {
	ApplicationCommandOptionType,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { WelcomeMessageService } from "../services/welcome-message.service"

@Injectable(WelcomeMessageService)
@SlashCommand({
	name: "welcome-message",
	description: "Gestiona los mensajes de bienvenida para nuevos miembros",
	permissions: PermissionFlagsBits.Administrator
})
export class WelcomeMessageCommand{
	constructor (private readonly service: WelcomeMessageService) {
	}

	@Subcommand({
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
	async configure ({ interaction }: CommandContext) {
		const enabled = interaction.options.getBoolean("activar")
		const message = interaction.options.getString("mensaje")
		const embedString = interaction.options.getString("embed")
		const waitTime = interaction.options.getInteger("tiempo")
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const updateResponse = await this.service.updateConfig({
			guildId: interaction.guildId,
			enabled,
			message,
			embedString,
			waitTime
		})
		await interaction.editReply(updateResponse)
	}

	@Subcommand({
		name: "ver",
		description: "Muestra la configuración actual."
	})
	async view ({ interaction }: CommandContext) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})

		const { reply, message } = await this.service.viewConfig(interaction.guildId!)

		await interaction.editReply(reply)
		if (message) {
			await interaction.followUp(message)
		}
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina la configuración actual"
	})
	async delete ({ interaction }: CommandContext) {
		await interaction.deferReply()

		const reply =  await this.service.delete(interaction.guildId!)
		await interaction.editReply(reply)
	}
}
