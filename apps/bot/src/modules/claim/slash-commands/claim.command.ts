import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { CommandContext } from "@/core/types"
import {
	Collection,
	EmbedBuilder,
	GuildTextBasedChannel,
	Message,
	MessageFlags,
	OverwriteResolvable,
	PermissionFlagsBits,
	TextChannel,
	User
} from "discord.js"
import { ClaimConfigModel, ClaimModel } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { moderatorRoleId } from "../utils/variables"

const ClaimLogger = botLogger.child("claim_command")

export class ClaimCommand extends BaseCommand {

	private responseEmbed (user: User, error: Error | null): EmbedBuilder  {
		const embed = new EmbedBuilder(
			{
				description: error
					? "Ha habido un error asignando el ticket."
					: `El ticket ha sido asignado por <@${user.id}>.`,
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
			limit: 1,
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
		const reason = messageContent?.embeds[1]?.description?.match(reasonRegex)

		if (!reason) {
			return null
		}

		return reason[1]
	}

	private async changeChannelPermissions (channel: TextChannel, moderatorId: string) : Promise<void> {
		const currentPermissions = Array.from(channel.permissionOverwrites.cache.values())
		const newPermissions: OverwriteResolvable[] = [
			{
				id: moderatorRoleId,
				deny: "SendMessages"
			},
			{
				id: moderatorId,
				allow: ["SendMessages", "ViewChannel"]
			}
		]

		await channel.permissionOverwrites.set([
			...currentPermissions,
			...newPermissions
		])
	}

	protected override async run (context: CommandContext): Promise<void> {
		const { interaction } = context
		const channel = interaction.channel as GuildTextBasedChannel
		const { parentId } = channel

		await interaction.deferReply()

		const categoryError = await this.validateCategory(interaction.guild!.id, parentId)
		if (categoryError) {
			await interaction.deleteReply()
			await interaction.followUp({
				flags: MessageFlags.Ephemeral,
				content: "El canal de texto no es válido."
			})
			return
		}

		try {
			await this.changeChannelPermissions(channel as TextChannel, interaction.user.id)

			let affectedUserId: string | null = null
			let reason: string | null = null

			const messages = await this.getMessages(channel as TextChannel)
			const firstMessage = messages.first()

			if (firstMessage) {
				affectedUserId = this.getAffectedUserId(firstMessage)
				reason = this.getReason(firstMessage)
			}

			await ClaimModel.insertOne(
				{
					guildId: interaction.guild?.id,
					moderatorId: interaction.user.id,
					ticketId: channel.id,
					affectedUserId,
					ticketReason: reason
				}
			)
		} catch (error) {
			ClaimLogger.error(
				"Error al asignar el ticket:", error instanceof Error ? error?.message : String(error)
			)

			await interaction.deleteReply()
			await interaction.followUp({
				flags: MessageFlags.Ephemeral,
				content: "Ha habido un error al asignarse el ticket."
			})
			return
		}

		await interaction.editReply({
			embeds: [ this.responseEmbed(interaction.user, null) ]
		})
	}
}

registerCommand(ClaimCommand, {
	name: "claim",
	description: "Comando para asignarse un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
