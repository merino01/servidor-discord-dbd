import { Injectable } from "@/core/container"
import { SlashCommand } from "@core/decorators/command.decorators"
import { botLogger } from "@/core/logger"
import { CommandContext } from "@/core/types"
import { MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js"
import { ClaimService } from "../services/claim.service"

const unclaimLogger = botLogger.child("unclaim_command")

@Injectable(ClaimService)
@SlashCommand({
	name: "unclaim",
	description: "Comando para desreclamar un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
export class UnClaimCommand {
	constructor (private readonly service: ClaimService) {}

	protected async run ({ interaction }: CommandContext) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			const { guild } = interaction
			if (!guild) { return }

			await this.service.unclaim(
				interaction.channel as TextChannel,
				interaction.user.id,
				guild.id
			)
			await interaction.editReply({ content: "El ticket se ha desasingnado." })
		} catch (error) {
			unclaimLogger.error(error instanceof Error ? error.message : String(error))
			await interaction.editReply({ content: "Ha ocurrido un error desasingnado el ticket" })
		}
	}
}

