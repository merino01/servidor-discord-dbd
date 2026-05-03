import {
	SlashCommand,
	Subcommand
} from "@/core/decorators/command.decorators"
import { CommandContext } from "@types"
import {
	PermissionFlagsBits,
	ChannelType,
	ApplicationCommandOptionType,
	MessageFlags
} from "discord.js"
import { AutoMessageService } from "../services/auto-message.service"
import { Injectable } from "@/core/container"

@Injectable(AutoMessageService)
@SlashCommand({
	name: "automensaje",
	description: "Gestiona los mensajes automáticos del servidor",
	permissions: PermissionFlagsBits.ManageChannels & PermissionFlagsBits.ManageMessages
})
export class AutoMessageCommand {
	constructor (private readonly service: AutoMessageService) {}
	@Subcommand({
		name: "crear",
		description: "Crea un nuevo mensaje automático",
		options: [
			{
				name: "nombre",
				description: "Nombre identificador del mensaje automático",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "mensaje",
				description: "El mensaje que se enviará",
				type: ApplicationCommandOptionType.String
			},
			{
				name: "embed",
				description: "El embed en formato JSON que se enviará",
				type: ApplicationCommandOptionType.String
			},
			{
				name: "cron",
				description: "Expresión cron (solo para canales, ej: '0 0 9 * * *' = 9:00 AM)",
				type: ApplicationCommandOptionType.String
			},
			{
				name: "canal",
				description: "Canal donde enviar el mensaje",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText]
			},
			{
				name: "categoria",
				description: "Categoría donde enviar el mensaje (a todos los canales de texto)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildCategory]
			},
			{
				name: "tiempo",
				description: "Tiempo de espera para enviar un mensaje tras la creación de un canal (en segundos)",
				type: ApplicationCommandOptionType.Integer
			},
			{
				name: "anclar",
				description: "Anclar los mensajes automaticos que se envian al crear un canal",
				type: ApplicationCommandOptionType.Boolean
			}
		]
	}) async crear ({ interaction }: CommandContext) {
		const options = this.service.getCrearOptions(interaction)
		const reply = await this.service.crear(options, interaction.guildId!, interaction.user)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "info",
		description: "Muestra info de un mensaje o lista todos con un menú",
		options: [
			{
				name: "id",
				description: "ID del mensaje automático (opcional, sin ID muestra lista)",
				type: ApplicationCommandOptionType.String
			},
			{
				name: "ver-eliminados",
				description: "Mostrar mensajes automáticos eliminados (solo si no se proporciona ID)",
				type: ApplicationCommandOptionType.Boolean
			}
		]
	})
	async info ({ interaction }: CommandContext) {
		const messageId = interaction.options.getString("id")
		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		const reply = await this.service.info({
			messageId,
			showDeleted: verEliminados,
			guildId: interaction.guildId!
		})

		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina un mensaje automático",
		options: [{
			name: "id",
			description: "ID del mensaje automático a eliminar",
			type: ApplicationCommandOptionType.String,
			required: true
		}]
	})
	async eliminar ({ interaction }: CommandContext) {
		const messageId = interaction.options.getString("id", true)

		const reply = await this.service.delete(messageId, interaction.guildId!, interaction.user)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "pausar",
		description: "Pausa un mensaje automático sin eliminarlo",
		options: [{
			name: "id",
			description: "ID del mensaje automático a pausar",
			type: ApplicationCommandOptionType.String,
			required: true
		}]
	})
	async pausar ({ interaction }: CommandContext) {
		const messageId = interaction.options.getString("id", true)

		const reply = await this.service.toggle(messageId, interaction.guildId!, interaction.user, false)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "reanudar",
		description: "Reanuda un mensaje automático pausado",
		options: [{
			name: "id",
			description: "ID del mensaje automático a reanudar",
			type: ApplicationCommandOptionType.String,
			required: true
		}]
	})
	async reanudar ({ interaction }: CommandContext) {
		const messageId = interaction.options.getString("id", true)

		const reply = await this.service.toggle(messageId, interaction.guildId!, interaction.user, true)
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

	@Subcommand({
		name: "variables",
		description: "Muestra la lista de variables disponibles para usar en mensajes"
	})
	async variables ( { interaction }: CommandContext) {
		const reply = this.service.variables()
		await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral })
	}

}
