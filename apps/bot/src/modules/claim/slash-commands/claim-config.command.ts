import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext } from "@/core/types"
import { ClaimConfigModel } from "@org/mongo"
import {
	ChannelType,
	EmbedBuilder,
	GuildChannel,
	MessageFlags,
	PermissionFlagsBits,
	ApplicationCommandOptionType
} from "discord.js"

const claimLogger = botLogger.child("claim-config")

export class ClaimConfigCommand extends BaseCommand {

	private createInfoEmbed (categories: string[]): EmbedBuilder  {
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
		const category = interaction.options.getChannel("categoria", true) as GuildChannel

		await interaction.deferReply()

		try {
			await ClaimConfigModel.insertOne({
				guildId: interaction.guild?.id,
				categoryId: category.id
			})

			const embed = this.createInfoEmbed([category.id])

			await interaction.editReply({
				embeds: [ embed ]
			})
		} catch (error) {
			claimLogger.error(error instanceof Error ? error?.message : String(error))
			await interaction.editReply({
				content: "Ha ocurrido un error al actualizar la configuración."
			})
		}
	}

	public async ver ({ interaction }: CommandContext) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})
		const categories = (await ClaimConfigModel.find(
			{
				guildId: interaction.guild?.id
			},
			{
				categoryId: 1,
				_id: 0
			}
		)).map((document) => document.categoryId)

		if (!categories.length) {
			await interaction.editReply({
				content: "No hay ninguna categoría configurada"
			})
			return
		}

		const embed = this.createInfoEmbed(categories)
		await interaction.editReply({
			embeds: [embed]
		})
	}

	public async eliminarCategoria ( { interaction }: CommandContext) {
		const category = interaction.options.getChannel("categoria", true)

		await interaction.deferReply()

		try {
			await ClaimConfigModel.findOneAndDelete({
				guildId: interaction.guild?.id,
				categoryId: category.id
			})

			await interaction.editReply({
				content: `Se ha eliminado la categoría <#${category.id}> de la configuración.`
			})

		} catch (error) {
			claimLogger.error("Error al intentar eliminar la categoria:", error)
			await interaction.editReply({
				content: "Ha habido un error al eliminar la categoría"
			})
		}
	}
}

registerCommand(ClaimConfigCommand, {
	name: "claim-config",
	description: "Configuración del comando claim",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})

registerSubCommand(ClaimConfigCommand, "añadirCategoria", {
	name: "añadir-categoria",
	description: "Añade una categoría donde funcionará el comando claim.",
	options: [
		{
			name: "categoria",
			description: "Categoria donde funcionará el comando",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ ChannelType.GuildCategory],
			required: true
		}
	]
})

registerSubCommand(ClaimConfigCommand, "ver", {
	name:	"ver",
	description: "Muestra las categorias de los canales donde funciona el comando claim."
})

registerSubCommand(ClaimConfigCommand, "eliminarCategoria", {
	name: "eliminar-categoria",
	description: "Elimina una categoría donde funcionará el comando claim.",
	options: [
		{
			name: "categoria",
			description: "Categoria donde dejará funcionará el comando",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildCategory],
			required: true
		}
	]
})
