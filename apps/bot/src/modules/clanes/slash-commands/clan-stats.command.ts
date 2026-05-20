import {
	PermissionFlagsBits,
	ApplicationCommandOptionType
} from "discord.js"
import { CommandContext } from "@types"
import { SlashCommand, Subcommand } from "@/core/decorators/command.decorators"
import { Injectable } from "@/core/container"
import { ClanStatsService } from "../services/clan-stats.service"

@Injectable(ClanStatsService)
@SlashCommand({
	name: "clan-stats",
	description: "Comando principal para estadísticas de clanes",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})
export class ClanStatsCommand {
	constructor (private readonly service: ClanStatsService) {}

	@Subcommand({
		name: "clan",
		description: "Ver las estadísticas de un clan",
		options: [
			{
				name: "rol",
				description: "Rol del clan",
				type: ApplicationCommandOptionType.Role,
				required: true
			}
		]
	})
	async clanStats ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()
		const clanRole = interaction.options.getRole("rol", true)

		const reply = await this.service.clanStats(interaction.guild!.id, clanRole.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "ranking-mensajes",
		description: "Ver ranking de clanes por mensajes"
	})
	async messageRanking ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()

		const reply = await this.service.messageRanking(interaction.guild!.id)
		await interaction.editReply(reply)
	}

	@Subcommand({
		name: "ranking-voz",
		description: "Ver ranking de clanes por tiempo en voz"
	})
	async voiceRanking ({ interaction }: CommandContext): Promise<void> {
		await interaction.deferReply()

		const reply = await this.service.voiceRanking(interaction.guild!.id)
		await interaction.editReply(reply)
	}
}
