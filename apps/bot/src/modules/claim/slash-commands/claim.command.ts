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
import { moderatorRoleId } from "../constants"

const claimLogger = botLogger.child("claim_command")

export class ClaimCommand extends BaseCommand {

	private createResponseEmbed (user: User, error: Error | null): EmbedBuilder {
		const embed = new EmbedBuilder({
			description: error
				? "Ha habido un error asignando el ticket."
				: `El ticket ha sido asignado a <@${user.id}>.`,
			color: error ? 0xed4245 : 0x57f287
		})
		return embed
	}

	private async isValidCategory (guildId: string, categoryId: string | null ): Promise<boolean> {
		if (!categoryId) {
			return false
		}

		const config = await ClaimConfigModel.findOne({
			guildId,
			categoryId
		})

		if (!config) {
			return false
		}

		return true
	}

	private async getMessages (channel: TextChannel): Promise<Collection<string, Message<true>>>{
		const messages = await channel.messages.fetch({
			limit: 1,
			after: "0"
		})

		return messages
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
				deny: PermissionFlagsBits.SendMessages,
				allow: PermissionFlagsBits.ViewChannel
			},
			{
				id: moderatorId,
				allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
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

		const valid = await this.isValidCategory(interaction.guild!.id, parentId)
		if (!valid) {
			await interaction.deleteReply()
			await interaction.followUp({
				flags: MessageFlags.Ephemeral,
				content: "El canal de texto no es válido."
			})
			return
		}

		try {
			await this.changeChannelPermissions(channel as TextChannel, interaction.user.id)

			const messages = await this.getMessages(channel as TextChannel)
			const firstMessage = messages.first()

			const affectedUserId = firstMessage ? this.getAffectedUserId(firstMessage) : null
			const reason = firstMessage ? this.getReason(firstMessage) : null

			await ClaimModel.insertOne({
				guildId: interaction.guild?.id,
				moderatorId: interaction.user.id,
				ticketId: channel.id,
				affectedUserId,
				ticketReason: reason
			})
		} catch (error) {
			claimLogger.error(
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
			embeds: [this.createResponseEmbed(interaction.user, null)]
		})
	}
}

registerCommand(ClaimCommand, {
	name: "claim",
	description: "Comando para asignarse un ticket.",
	permissions: PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles
})
