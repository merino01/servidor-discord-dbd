import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext, OptionType } from "@/core/types"
import { ClaimConfigModel } from "@org/mongo"
import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js"

const ClaimLogger = botLogger.child("claim-config")

export class ClaimConfigCommand extends BaseCommand {

	private infoEmbed (categories: [ string ]): EmbedBuilder  {
		let description = "Categorías configuradas:"
		for (const categoryId of categories) {
			description += `\n <#${categoryId}>`
		}

		const embed = new EmbedBuilder({
			description
		})
		return embed
	}

	public async añadirCategoria ({ interaction }: CommandContext) {
		const category = interaction.options.getChannel("categoria", true)

		if (category.type !== ChannelType.GuildCategory) {
			await interaction.reply(
				{
					content: "Selecciona una categoría válida.",
					flags: MessageFlags.Ephemeral
				}
			)
			return
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
			ClaimLogger.error(error instanceof Error ? error.message : String(error))
			await interaction.editReply({
				content: "Ha ocurrido un error al actualizar la configuración."
			})
		}
	}

	public async ver ({ interaction }: CommandContext) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})
		const config = await ClaimConfigModel.findOne({
			guildId: interaction.guild?.id
		})

		if (!config) {
			await interaction.editReply({
				content: "No hay ninguna categoría configurada"
			})
			return
		}

		const embed = this.infoEmbed(config.categories)
		await interaction.editReply({
			embeds: [embed]
		})
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
