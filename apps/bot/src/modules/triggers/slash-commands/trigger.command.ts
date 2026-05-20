import { CommandContext } from "@types"
import {
	PermissionFlagsBits,
	MessageFlags,
	ApplicationCommandOptionType,
	ChannelType
} from "discord.js"
import { TriggerMatchType } from "@org/mongo"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { TriggerService } from "../services/trigger.service"

@Injectable(TriggerService)
@SlashCommand({
	name: "trigger",
	description: "Gestiona los triggers del servidor",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages
})
export class TriggerCommand {
	constructor (private readonly service: TriggerService) {}
	// eslint-disable-next-line max-lines-per-function
	@Subcommand({
		name: "crear",
		description: "Crea un nuevo trigger",
		options: [
			{
				name: "texto",
				description: "El texto que activará el trigger",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "respuesta",
				description: "La respuesta que dará el bot",
				type: ApplicationCommandOptionType.String,
				required: true
			},
			{
				name: "tipo",
				description: "Tipo de coincidencia",
				type: ApplicationCommandOptionType.String,
				required: false,
				choices: [
					{ name: "Palabra completa (recomendado)", value: TriggerMatchType.WORD },
					{ name: "Contiene el texto", value: TriggerMatchType.CONTAINS },
					{ name: "Empieza con el texto", value: TriggerMatchType.STARTS_WITH },
					{ name: "Termina con el texto", value: TriggerMatchType.ENDS_WITH },
					{ name: "Exacto (mensaje completo)", value: TriggerMatchType.EXACT },
					{ name: "Expresión regular", value: TriggerMatchType.REGEX }
				]
			},
			{
				name: "case-sensitive",
				description: "¿Diferenciar mayúsculas/minúsculas?",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: "canal1",
				description: "Canal donde aplicar (vacío = todos)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
				required: false
			},
			{
				name: "canal2",
				description: "Canal adicional (opcional)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
				required: false
			},
			{
				name: "canal3",
				description: "Canal adicional (opcional)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
				required: false
			},
			{
				name: "canal4",
				description: "Canal adicional (opcional)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
				required: false
			},
			{
				name: "canal5",
				description: "Canal adicional (opcional)",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
				required: false
			},
			{
				name: "excluir-canales",
				description: "Si es true, excluye los canales especificados",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: "eliminar-mensaje",
				description: "Eliminar el mensaje original del usuario",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			},
			{
				name: "regex-flags",
				description: "Flags para regex (ej: 'gi', 'i')",
				type: ApplicationCommandOptionType.String,
				required: false
			}
		]
	})
	async create ({ interaction }: CommandContext) {
		const options = this.service.extractCrearOptions(interaction)

		const reply = await this.service.crear({
			...options,
			guildId: interaction.guildId!,
			userId: interaction.user.id
		})

		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "info",
		description: "Lista todos los triggers del servidor",
		options: [
			{
				name: "ver-eliminados",
				description: "Mostrar triggers eliminados en lugar de activos",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			}
		]
	})
	async info ({ interaction }: CommandContext) {
		const verEliminados = interaction.options.getBoolean("ver-eliminados") ?? false

		const reply = await this.service.info(interaction.guildId!, verEliminados)
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})
	}

	@Subcommand({
		name: "eliminar",
		description: "Elimina un trigger existente",
		options: [
			{
				name: "id",
				description: "El ID del trigger a eliminar (usa /trigger listar para ver los IDs)",
				type: ApplicationCommandOptionType.String,
				required: true
			}
		]
	})	async delete ({ interaction }: CommandContext) {
		const triggerId = interaction.options.getString("id", true)

		const reply = await this.service.eliminar(triggerId, interaction.guildId!, interaction.user)
		await interaction.reply({
			...reply,
			flags: MessageFlags.Ephemeral
		})

	}
}
