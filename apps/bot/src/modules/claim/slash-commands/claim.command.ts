import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext } from "@/core/types"
import { EmbedBuilder, GuildTextBasedChannel, PermissionFlagsBits, User } from "discord.js"
import { ClaimModel } from "@org/mongo"
import { botLogger } from "@/core/logger"

const ClaimLogger = botLogger.child("claim_command")

export class ClaimCommand extends BaseCommand {

	private responseEmbed (user: User, ok: boolean): EmbedBuilder  {
		const embed = new EmbedBuilder(
			{
				description: !ok
					? "Ha habido un error reclamando el ticket."
					: `El ticket ha sido reclamado por <@${user.id}>.`,
				color: !ok ? 0xed4245 : 0x57f287
			}
		)
		return embed
	}

	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const { name: channelName } = interaction.channel as GuildTextBasedChannel

		await interaction.deferReply({})

		let ok = true

		try {
			await ClaimModel.findOneAndUpdate({
				guildId: interaction.guildId,
				userId: interaction.user.id
			},
			{
				$inc: { ticket_count: 1 },
				last_ticket_claimed: channelName,
				last_ticket_date: Date.now()
			},
			{
				upsert: true, new: true
			}
			)
		} catch (error) {
			ClaimLogger.error(
				"Error al actualizar el número de tickets:", error instanceof Error ? error.message : String(error)
			)
			ok = false
		}

		await interaction.editReply({
			embeds: [ this.responseEmbed(interaction.user, ok) ]
		})

	}

	public config () {
		console.log("config")
	}
}

registerCommand(ClaimCommand, {
	name: "claim",
	description: "Comando para reclamar un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})

registerSubCommand(ClaimCommand, "config", {
	name: "config",
	description: "Configura el comando claim."
})
