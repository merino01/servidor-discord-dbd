import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { CommandContext } from "@/core/types"
import {
	Collection,
	EmbedBuilder,
	GuildTextBasedChannel,
	Message,
	PermissionFlagsBits,
	TextChannel,
	User
} from "discord.js"
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
				guildId,
				categoryId
			}
		)

		if (!config) {
			return invalidError
		}

		return null
	}

	private async getMessages (channel: TextChannel): Promise<Collection<string, Message<true>>>{
		const messages = await channel.messages.fetch({
			limit: 3,
			after: "0"
		})

		return messages.reverse()
	}

	private getAffectedUserId (messageContent: Message<true>): string | null {
		const digitRegex = /\d/g
		const userId = messageContent?.content?.match(digitRegex)?.join("")

		return userId ?? null
	}

	private getReason (messageContent: Message<true>): string | null {
		const reasonRegex = /```([\s\S]*?)```/
		const reason = messageContent?.embeds[0]?.description?.match(reasonRegex)

		if (!reason) {
			return null
		}

		return reason[1]
	}

	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const channel = interaction.channel as GuildTextBasedChannel
		const { parentId } = channel

		await interaction.deferReply()

		const categoryError = await this.validateCategory(interaction.guild!.id, parentId)
		if (!categoryError) {
			try {
				let affectedUserId: string | null = null
				let reason: string | null = null

				const messages = await this.getMessages(channel as TextChannel)
				const firstMessage = messages.first()
				const thirdMessage = messages.at(2)

				if (firstMessage) {
					affectedUserId = this.getAffectedUserId(firstMessage)
				}
				if (thirdMessage) {
					reason = this.getReason(thirdMessage)
				}

				await ClaimModel.insertOne(
					{
						guildId: interaction.guild?.id,
						moderatorId: interaction.user.id,
						affectedUserId,
						ticketReason: reason
					}
				)
			} catch (error) {
				ClaimLogger.error(
					"Error al reclamar el ticket:", error instanceof Error ? error?.message : String(error)
				)
			}
		}

		// TO DO: Cambiar permisos
		await interaction.editReply({
			embeds: [ this.responseEmbed(interaction.user, categoryError) ]
		})

	}
}

registerCommand(ClaimCommand, {
	name: "claim",
	description: "Comando para reclamar un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
