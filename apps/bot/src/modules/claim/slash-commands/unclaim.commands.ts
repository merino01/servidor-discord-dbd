import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { botLogger } from "@/core/logger"
import { CommandContext } from "@/core/types"
import { ClaimModel } from "@org/mongo"
import { MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js"
import { moderatorRoleId } from "../constants"

const unclaimLogger = botLogger.child("unclaim_command")

export class UnClaimCommand extends BaseCommand {
	private async changeChannelPermissions (channel: TextChannel, moderatorId: string) : Promise<void> {
		await channel.permissionOverwrites.delete(moderatorId)
		await channel.permissionOverwrites.edit(moderatorRoleId, {
			SendMessages: true,
			ViewChannel: true
		})
	}

	protected override async run ({ interaction }: CommandContext) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		})
		try {
			await this.changeChannelPermissions(interaction.channel as TextChannel, interaction.user.id)

			await ClaimModel.findOneAndUpdate(
				{
					guildId: interaction.guild!.id,
					ticketId: interaction.channel?.id
				},
				{
					unclaimedAt: new Date()
				}
			)

			await interaction.editReply({
				content: "El ticket se ha desasingnado."
			})
		} catch (error) {
			unclaimLogger.error(error instanceof Error ? error.message : String(Error))
			await interaction.editReply({
				content: "Ha ocurrido un error desasingnado el ticket"
			})
		}

	}
}

registerCommand(UnClaimCommand, {
	name: "unclaim",
	description: "Comando para desreclamar un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})

