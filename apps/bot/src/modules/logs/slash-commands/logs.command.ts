import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { LogType } from "@org/mongo"
import { CommandContext } from "@types"
import {
	ApplicationCommandOptionType,
	ChannelType,
	GuildTextBasedChannel,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { LogsService } from "../services/logs.services"

@Injectable(LogsService)
@SlashCommand({
	name: "logs",
	description: "Configura el sistema de logs del servidor",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})
export class LogsCommand{
	constructor (protected readonly service: LogsService) {}
	@Subcommand({
		name: "configurar",
		description: "Configura un tipo de log",
		options: [
			{
				name: "tipo",
				description: "Tipo de log a configurar",
				type: ApplicationCommandOptionType.String,
				required: true,
				choices: [
					{ name: "📝 Comandos", value: LogType.COMMANDS },
					{ name: "📋 Clanes", value: LogType.CLANS },
					{ name: "💬 Mensajes", value: LogType.MESSAGES },
					{ name: "🔊 Voz", value: LogType.VOICE },
					{ name: "🛡️ Moderación", value: LogType.MODERATION },
					{ name: "👥 Miembros", value: LogType.MEMBERS }
				]
			},
			{
				name: "habilitado",
				description: "Activar o desactivar este tipo de log",
				type: ApplicationCommandOptionType.Boolean,
				required: true
			},
			{
				name: "canal",
				description: "Canal donde se enviarán los logs",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText],
				required: false
			}
		]
	})
	async configurar ({ interaction }: CommandContext): Promise<void> {
		const tipo = interaction.options.getString("tipo", true) as LogType
		const habilitado = interaction.options.getBoolean("habilitado", true)
		const canal = interaction.options.getChannel("canal") as GuildTextBasedChannel ?? null

		const reply = await this.service.configure(interaction.guildId!, tipo, habilitado, canal)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "ver",
		description: "Ver la configuración actual de logs"
	})
	async ver ({ interaction }: CommandContext): Promise<void> {
		const reply = await this.service.view(interaction.guildId!)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}
}
