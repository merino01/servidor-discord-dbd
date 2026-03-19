import { Injectable } from "@/core/container"
import { SlashCommand, Subcommand } from "@core/decorators/command.decorators"
import { botLogger } from "@/core/logger"
import { CommandContext, OptionType } from "@/core/types"
import {
	ChannelType,
	EmbedBuilder,
	GuildChannel,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js"
import { ClaimConfigService } from "../services/claim-config.service"

const claimLogger = botLogger.child("claim-config")

@Injectable(ClaimConfigService)
@SlashCommand({
	name: "claim-config",
	description: "Configuración del comando claim",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})
export class ClaimConfigCommand {
	constructor (private readonly service: ClaimConfigService) {}

	private buildCategoriesEmbed (categories: string[]): EmbedBuilder {
		let description = "Categorías configuradas:"
		for (const categoryId of categories) {
			description += `\n <#${categoryId}>`
		}
		return new EmbedBuilder({ description })
	}

	private isValidCategory (category: ChannelType): boolean {
		return category === ChannelType.GuildCategory
	}

	@Subcommand({
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
	public async añadirCategoria ({ interaction }: CommandContext) {
		const { guild } = interaction
		if (!guild) { return }

		const category = interaction.options.getChannel("categoria", true) as GuildChannel

		if (!this.isValidCategory(category.type)) {
			await interaction.reply({
				content: "La categoría seleccionada no es válida.",
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply()

		try {
			await this.service.addCategory(guild.id, category.id)
			await interaction.editReply({ embeds: [this.buildCategoriesEmbed([category.id])] })
		} catch (error) {
			claimLogger.error(error instanceof Error ? error.message : String(error))
			await interaction.editReply({ content: "Ha ocurrido un error al actualizar la configuración." })
		}
	}

	@Subcommand({
		name: "ver",
		description: "Muestra las categorias de los canales donde funciona el comando claim."
	})
	public async ver ({ interaction }: CommandContext) {
		const { guild } = interaction
		if (!guild) { return }

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const categories = await this.service.getCategories(guild.id)

		if (!categories.length) {
			await interaction.editReply({ content: "No hay ninguna categoría configurada" })
			return
		}

		await interaction.editReply({ embeds: [this.buildCategoriesEmbed(categories)] })
	}

	@Subcommand({
		name: "eliminar-categoria",
		description: "Elimina una categoría donde funcionará el comando claim.",
		options: [
			{
				name: "categoria",
				description: "Categoria donde dejará de funcionar el comando",
				type: OptionType.CHANNEL,
				required: true
			}
		]
	})
	public async eliminarCategoria ({ interaction }: CommandContext) {
		const { guild } = interaction
		if (!guild) { return }

		const category = interaction.options.getChannel("categoria", true)

		if (!this.isValidCategory(category.type)) {
			await interaction.reply({ content: "Selecciona una categoría valida.", flags: MessageFlags.Ephemeral })
			return
		}

		await interaction.deferReply()

		try {
			await this.service.removeCategory(guild.id, category.id)
			await interaction.editReply({
				content: `Se ha eliminado la categoría <#${category.id}> de la configuración.`
			})
		} catch (error) {
			claimLogger.error("Error al intentar eliminar la categoria:", error)
			await interaction.editReply({ content: "Ha habido un error al eliminar la categoría" })
		}
	}
}
