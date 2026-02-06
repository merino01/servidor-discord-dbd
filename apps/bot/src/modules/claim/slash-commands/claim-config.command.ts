import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext, OptionType } from "@/core/types"
import { ClaimConfigModel } from "@org/mongo"
import { CategoryChannel, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, User } from "discord.js"

export class ClaimConfigCommand extends BaseCommand {

	private infoEmbed (categories: [ string ]): EmbedBuilder  {
		let description = "Categorías configuradas:"
		for (const categoryId of categories) {
			description += `\n <#${categoryId}`
		}

		const embed = new EmbedBuilder({
			description
		})
		return embed
	}

	public async añadirCategoria ({ interaction }: CommandContext) {
		const category = interaction.options.getChannel("category", true)

		if (category.type !== ChannelType.GuildCategory) {
			return await interaction.reply(
				{
					content: "Selecciona una categoría válida.",
					flags: MessageFlags.Ephemeral
				}
			)
		}

		await interaction.deferReply()

		try {
			const { categories } = await ClaimConfigModel.findOneAndUpdate({
				guildId: interaction.guild!.id
			},
			{
				$addToSet: { categories: category }
			},
			{ upsert: true, new:true }
			)

			const embed = this.infoEmbed(categories)

			await interaction.editReply({
				embeds: [ embed ]
			})
		} catch (error) {
			// TEMPORAL
			console.log(error)
		}
	}
}

registerCommand(ClaimConfigCommand, {
	name: "claim-config",
	description: "Configuración del comando claim",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})

registerSubCommand (ClaimConfigCommand, "añadirCategoria", {
	name: "añadir-categoria",
	description: "Añade una categoría donde funcionará el comando claim.",
	options: [
		{
			name: "categoria",
			description: "Categoria donde funcionará el comando",
			type: OptionType.CHANNEL,
			required: true
		}
	]
})
