import { Injectable } from "@/core/container"
import { StatsService } from "../services/stats.service"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { CommandContext } from "@/core/types"
import { ApplicationCommandOptionType } from "discord.js"

@Injectable(StatsService)
@SlashCommand({
	name: "stats",
	description: "Ver estadísticas y niveles de usuarios"
})
export class StatsCommand {
	constructor (private service: StatsService) {}

	@Subcommand({
		name: "perfil",
		description: "Ver el perfil de estadísticas de un usuario",
		options: [
			{
				name: "usuario",
				description: "Usuario a consultar (vacío para ti mismo)",
				type: ApplicationCommandOptionType.User,
				required: false
			}
		]
	})
	async perfil ({ interaction }: CommandContext): Promise<void> {
		const targetUser = interaction.options.getUser("usuario") ?? interaction.user
		await interaction.deferReply()

		const response = await this.service.profile(interaction.user, targetUser, interaction.guildId!)
		await interaction.editReply(response)
	}

	@Subcommand({
		name: "ranking",
		description: "Ver el ranking del servidor"
	})
	async ranking ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()

		const reply = await this.service.ranking(
			interaction.user,
			interaction.client.users,
			interaction.guild!
		)

		await interaction.editReply(reply)
	}

}
