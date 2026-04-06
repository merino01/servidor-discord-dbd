import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@core/decorators/command.decorators"
import { CommandContext } from "@/core/types"
import {
	PermissionFlagsBits,
	MessageFlags,
	ApplicationCommandOptionType,
	ChannelType,
	GuildChannel
} from "discord.js"
import { FormatService } from "../services/format.service"

@Injectable(FormatService)
@SlashCommand({
	name: "formato",
	description: "Configura formatos de mensajes para canales",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages,
	guildOnly: true
})
export class FormatCommand {
	constructor (
		private readonly service: FormatService
	) {}

	@Subcommand({
		name: "configurar",
		description: "Configura un formato para un canal",
		options: [
			{
				name: "nombre",
				description: "Nombre identificador del formato",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "canal",
				description: "Canal a configurar",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText],
				required: true
			},
			{
				name: "patron",
				description: "Patrón regex (ej: \\d+ para solo números)",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "flags",
				description: "Flags del regex (ej: i para case-insensitive)",
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: "eliminar",
				description: "Eliminar mensajes que no cumplan (default: true)",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: "notificar",
				description: "Notificar al usuario (default: true)",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			}
		]
	})
	async configurar ({ interaction }: CommandContext): Promise<void> {
		const name = interaction.options.getString("nombre", true)
		const channel = interaction.options.getChannel("canal", true) as GuildChannel
		const pattern = interaction.options.getString("patron", true)
		const flags = interaction.options.getString("flags") || ""
		const deleteMsg = interaction.options.getBoolean("eliminar") ?? true
		const notify = interaction.options.getBoolean("notificar") ?? true

		const reply = await this.service.configurate({
			channel,
			name,
			pattern,
			flags,
			deleteMessage: deleteMsg,
			notify,
			guildId: interaction.guildId!
		})

		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "info",
		description: "Lista todos los formatos configurados",
		options: [
			{
				name: "ver-eliminados",
				description: "Mostrar formatos eliminados",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			}
		]
	})
	async info ({ interaction }: CommandContext): Promise<void> {
		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		const reply = await this.service.info(verEliminados, interaction.guildId!)
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina un formato",
		options: [
			{
				name: "id",
				description: "ID del formato a eliminar",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	})
	async eliminar ({ interaction }: CommandContext): Promise<void> {
		const formatId = interaction.options.getString("id", true)

		const reply = await this.service.remove({
			formatId,
			guildId: interaction.guildId!,
			user: interaction.user })
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "pausar",
		description: "Pausa un formato sin eliminarlo",
		options: [
			{
				name: "id",
				description: "ID del formato a pausar",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	})
	async pausar ({ interaction }: CommandContext): Promise<void> {
		const formatId = interaction.options.getString("id", true)

		const reply = await this.service.toggleState({
			formatId,
			guildId: interaction.guildId!,
			user: interaction.user,
			newState: false
		})
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "reanudar",
		description: "Reanuda un formato pausado",
		options: [
			{
				name: "id",
				description: "ID del formato a reanudar",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	})
	async reanudar ({ interaction }: CommandContext): Promise<void> {
		const formatId = interaction.options.getString("id", true)

		const reply = await this.service.toggleState({
			formatId,
			guildId: interaction.guildId!,
			user: interaction.user,
			newState: true
		})
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}
}
