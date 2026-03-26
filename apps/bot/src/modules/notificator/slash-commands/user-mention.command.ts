import { PermissionFlagsBits, ApplicationCommandOptionType, MessageFlags } from "discord.js"
import { CommandContext } from "@/core/types"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { NotificatorService } from "../services/notificator.service"

@Injectable(NotificatorService)
@SlashCommand({
	name: "user-mention",
	description: "Configura una notificación para mencionar a un usuario cuando se detecte un patrón en los mensajes.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages
})
export class NotificatorCommand{
	constructor (private readonly service: NotificatorService) {}

	@Subcommand({
		name: "crear",
		description: "Crea una nueva notificación de mención de usuario.",
		options: [
			{
				name: "usuario",
				description: "El usuario a mencionar cuando se detecte el patrón.",
				required: true,
				type: ApplicationCommandOptionType.User
			},
			{
				name: "patron",
				description: "El patrón a detectar en los mensajes (expresión regular).",
				required: true,
				type: ApplicationCommandOptionType.String
			},
			{
				name: "canales",
				description: "Canales donde la notificación estará activa, separados por comas",
				required: false,
				type: ApplicationCommandOptionType.String
			},
			{
				name: "excluir_canales",
				description: "Si se deben excluir los canales especificados en lugar de incluirlos.",
				required: false,
				type: ApplicationCommandOptionType.Boolean
			}
		]
	})
	async crear ({ interaction }: CommandContext) {
		const user = interaction.options.getUser("usuario", true)
		const patron = interaction.options.getString("patron", true)
		const canales = interaction.options.getString("canales")
		const excludeChannels = interaction.options.getBoolean("excluir_canales")

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.createUserMentionNotification({
			user,
			patron,
			canales,
			excludeChannels,
			guildId: interaction.guildId!,
			interactionUser: interaction.user
		})

		await interaction.editReply(reply)
	}
}
