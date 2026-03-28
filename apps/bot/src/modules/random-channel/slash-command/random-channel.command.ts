import {
	ChannelType,
	MessageFlags,
	VoiceBasedChannel,
	ApplicationCommandOptionType,
	CategoryChannel
} from "discord.js"
import { CommandContext } from "@/core/types"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { RandomChannelService } from "../services/random-channel.service"

@Injectable(RandomChannelService)
@SlashCommand({
	name: "random-channel",
	description: "Configura el canal aleatorio.",
	options: [
		{
			name: "canales",
			description: "Los canales de voz a configurar (ids separados por comas).",
			type: ApplicationCommandOptionType.String,
			required: false
		},
		{
			name: "categoria",
			description: "La categoría de canales a configurar.",
			type: ApplicationCommandOptionType.Channel,
			channelTypes:[ChannelType.GuildCategory],
			required: false
		},
		{
			name: "excluir-canales",
			description: "Definir si excluir los canales en lugar de incluirlos.",
			type: ApplicationCommandOptionType.Boolean,
			required: false
		}
	]
})
export class RandomChannelCommand {
	constructor (private readonly service: RandomChannelService){}

	@Subcommand({
		name: "eliminar",
		description: "Elimina la configuración del canal aleatorio.",
		options: [{
			name: "canal",
			description: "El canal aleatorio a eliminar.",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildVoice],
			required: true
		}]
	})
	async remove ({ interaction }: CommandContext) {
		const channel = interaction.options.getChannel("canal", true) as VoiceBasedChannel

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.remove(channel, interaction.guild!)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "configurar",
		description: "Configura el canal aleatorio.",
		options: [
			{
				name: "canales",
				description: "Los canales de voz a configurar (ids separados por comas).",
				type: ApplicationCommandOptionType.String,
				required: false
			},
			{
				name: "categoria",
				description: "La categoría de canales a configurar.",
				type: ApplicationCommandOptionType.Channel,
				channelTypes:[ChannelType.GuildCategory],
				required: false
			},
			{
				name: "excluir-canales",
				description: "Definir si excluir los canales en lugar de incluirlos.",
				type: ApplicationCommandOptionType.Boolean,
				required: false
			}
		]
	})
	async configure ({ interaction }: CommandContext) {
		const channelIds = interaction.options.getString("canales")
		const category = interaction.options.getChannel("categoria") as CategoryChannel
		const excludeChannels = interaction.options.getBoolean("excluir-canales") ?? false

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const reply = await this.service.configure({
			category,
			channelIds,
			excludeChannels,
			guild: interaction.guild!
		})

		await interaction.editReply(reply)
	}

}
