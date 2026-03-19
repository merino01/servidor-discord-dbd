import { Injectable } from "@/core/container"
import { SlashCommand } from "@core/decorators/command.decorators"
import { CommandContext } from "@/core/types"
import {
	EmbedBuilder,
	GuildTextBasedChannel,
	MessageFlags,
	PermissionFlagsBits,
	TextChannel,
	User
} from "discord.js"
import { botLogger } from "@/core/logger"
import { ClaimService } from "../services/claim.service"

const claimLogger = botLogger.child("claim_command")

@Injectable(ClaimService)
@SlashCommand({
	name: "claim",
	description: "Comando para asignarse un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
export class ClaimCommand {
	constructor (private readonly service: ClaimService) {}

	private buildEmbed (user: User): EmbedBuilder {
		return new EmbedBuilder({
			description: `El ticket ha sido asignado a <@${user.id}>.`,
			color: 0x57f287
		})
	}

	protected async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const { guild } = interaction
		if (!guild) { return }

		const channel = interaction.channel as GuildTextBasedChannel

		await interaction.deferReply()

		const valid = await this.service.isValidCategory(guild.id, channel.parentId)
		if (!valid) {
			await interaction.deleteReply()
			await interaction.followUp({
				flags: MessageFlags.Ephemeral,
				content: "El canal de texto no es válido."
			})
			return
		}

		try {
			await this.service.claim(channel as TextChannel, interaction.user.id, guild.id)
		} catch (error) {
			claimLogger.error("Error al asignar el ticket:", error instanceof Error ? error.message : String(error))
			await interaction.deleteReply()
			await interaction.followUp({
				flags: MessageFlags.Ephemeral,
				content: "Ha habido un error al asignarse el ticket."
			})
			return
		}

		await interaction.editReply({
			embeds: [this.buildEmbed(interaction.user)]
		})
	}
}
