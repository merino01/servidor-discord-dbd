import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { CommandContext } from "@/core/types"
import { EmbedBuilder, GuildTextBasedChannel, PermissionFlagsBits, User } from "discord.js"
import { ClaimConfigModel, ClaimModel } from "@org/mongo"
import { botLogger } from "@/core/logger"

const ClaimLogger = botLogger.child("claim_command")

export class ClaimCommand extends BaseCommand {

	private responseEmbed (user: User, error: Error | null): EmbedBuilder  {
		const embed = new EmbedBuilder(
			{
				description: error
					? error.message ?? "Ha habido un error reclamando el ticket."
					: `El ticket ha sido reclamado por <@${user.id}>.`,
				color: error ? 0xed4245 : 0x57f287
			}
		)
		return embed
	}

	private async validateCategory (guildId: string, categoryId: string | null ): Promise<Error | null> {
		const invalidError = new Error("El canal de texto no es válido.")
		if (!categoryId) {
			return invalidError
		}

		const config = await ClaimConfigModel.findOne(
			{
				guildId
			}
		)

		if (!config || !config.categories.includes(categoryId)) {
			return invalidError
		}

		return null
	}

	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const { name: channelName, parentId } = interaction.channel as GuildTextBasedChannel

		await interaction.deferReply()

		const categoryError = await this.validateCategory(interaction.guild!.id, parentId)
		if (!categoryError) {
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
					"Error al actualizar el número de tickets:", error instanceof Error ? error?.message : String(error)
				)
			}
		}

		// Cambiar permisos del ticket??
		await interaction.editReply({
			embeds: [ this.responseEmbed(interaction.user, categoryError) ]
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
