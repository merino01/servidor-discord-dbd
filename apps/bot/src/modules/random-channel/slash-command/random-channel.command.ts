import { ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js"
import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@/core/types"
import { RandomChannelModel } from "@org/mongo"

class RandomChannelCommand extends BaseCommand {
	public async configurar (context: CommandContext) {
		const { interaction } = context

		const channelIds = interaction.options.getString("canales")
		const category = interaction.options.getChannel("categoria")
		const excludeChannels = interaction.options.getBoolean("excluir-canales") ?? false

		if (!channelIds && !category) {
			await interaction.reply({
				content: "Debes proporcionar una lista de canales o una categoría.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		const channel = await interaction.guild?.channels.create({
			name: "Canal Aleatorio",
			type: ChannelType.GuildVoice,
			parent: category ? category.id : undefined
		})
		if (!channel) {
			await interaction.reply({
				content: "No se pudo crear el canal aleatorio.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await channel.setPosition(0)

		RandomChannelModel.insertOne({
			guildId: interaction.guild!.id,
			mainChannelId: channel.id,
			channelIds: channelIds ? channelIds.split(",").map((id) => id.trim()) : [],
			categoryId: category ? category.id : null,
			excludeChannels
		})

		interaction.reply({
			content: "Canales aleatorios configurados correctamente.",
			flags: MessageFlags.Ephemeral
		})
	}
}

registerCommand(RandomChannelCommand, {
	name: "random-channel",
	description: "Configura un canal aleatorio para mover a los usuarios.",
	permissions: PermissionFlagsBits.Administrator
})

registerSubCommand(RandomChannelCommand, "configurar", {
	name: "configurar",
	description: "Configura el canal aleatorio.",
	options: [
		{
			name: "canales",
			description: "Los canales de voz a configurar (ids separados por comas).",
			type: OptionType.STRING,
			required: false
		},
		{
			name: "categoria",
			description: "La categoría de canales a configurar.",
			type: OptionType.CHANNEL,
			required: false
		},
		{
			name: "excluir-canales",
			description: "Definir si excluir los canales en lugar de incluirlos.",
			type: OptionType.BOOLEAN,
			required: false
		}
	]
})
