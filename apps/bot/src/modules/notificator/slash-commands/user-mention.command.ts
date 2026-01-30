import { PermissionFlagsBits } from "discord.js"
import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext, OptionType } from "@/core/types"
import { UserNotificationModel } from "@org/mongo"

const notificatorLogger = botLogger.child("notificator")

class UserMentionCommand extends BaseCommand {
	public async crear (context: CommandContext) {
		const { interaction } = context

		const user = interaction.options.getUser("usuario", true)
		const patron = interaction.options.getString("patron", true)
		const canales = interaction.options.getString("canales")
		const excludeChannels = interaction.options.getBoolean("excluir_canales")

		try {
			new RegExp(patron)
		} catch (error) {
			await interaction.reply({
				content: `El patrón no es una expresión regular válida: \`${
					error instanceof Error ? error.message : String(error)
				}\``,
				ephemeral: true
			})
			return
		}

		const channelList = canales?.split(",").map((c) => c.trim()).filter((c) => c.length > 0)

		const newNotification = await UserNotificationModel.create({
			guildId: interaction.guildId!,
			mentionTo: user.id,
			createdBy: interaction.user.id,
			regexPattern: patron,
			regexFlags: "ig",
			channels: channelList || [],
			excludeChannels: excludeChannels || false
		})
		notificatorLogger.info(
			`Nueva notificación de mención creada en guild ${
				interaction.guildId
			} para mencionar a ${user.id} por ${interaction.user.id}`
		)

		await interaction.reply({
			content: `Notificación creada correctamente para mencionar a ${user.tag} cuando se detecte el patrón \`${
				patron}\`. ID de la notificación: \`${newNotification._id}\``,
			ephemeral: true
		})
	}
}

registerCommand(UserMentionCommand, {
	name: "user-mention",
	description: "Configura una notificación para mencionar a un usuario cuando se detecte un patrón en los mensajes.",
	permissions: PermissionFlagsBits.ManageChannels & PermissionFlagsBits.ManageMessages
})

registerSubCommand(UserMentionCommand, "crear", {
	name: "crear",
	description: "Crea una nueva notificación de mención de usuario.",
	options: [
		{
			name: "usuario",
			description: "El usuario a mencionar cuando se detecte el patrón.",
			required: true,
			type: OptionType.USER
		},
		{
			name: "patron",
			description: "El patrón a detectar en los mensajes (expresión regular).",
			required: true,
			type: OptionType.STRING
		},
		{
			name: "canales",
			description: "Canales donde la notificación estará activa, separados por comas",
			required: false,
			type: OptionType.STRING
		},
		{
			name: "excluir_canales",
			description: "Si se deben excluir los canales especificados en lugar de incluirlos.",
			required: false,
			type: OptionType.BOOLEAN
		}
	]
})
