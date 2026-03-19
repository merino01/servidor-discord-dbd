import { Injectable } from "@/core/container"
import {
	Message,
	OverwriteResolvable,
	PermissionFlagsBits,
	TextChannel
} from "discord.js"
import { ClaimRepository, CreateClaimData } from "../repositories/claim.repository"
import { ClaimConfigRepository } from "../repositories/claim-config.repository"
import { moderatorRoleId } from "../constants"

@Injectable(ClaimRepository, ClaimConfigRepository)
export class ClaimService {
	constructor (
		private readonly claimRepo: ClaimRepository,
		private readonly configRepo: ClaimConfigRepository
	) {}

	async isValidCategory (guildId: string, categoryId: string | null): Promise<boolean> {
		if (!categoryId) {
			return false
		}
		const config = await this.configRepo.findByCategory(guildId, categoryId)
		return config !== null
	}

	private async getFirstMessage (channel: TextChannel): Promise<Message<true> | undefined> {
		const messages = await channel.messages.fetch({ limit: 1, after: "0" })
		return messages.first()
	}

	private extractAffectedUserId (message: Message<true>): string | null {
		return message.content?.match(/\d/g)?.join("") ?? null
	}

	private extractReason (message: Message<true>): string | null {
		const regex = /```([\s\S]*?)```/
		const match = regex.exec(message.embeds[1]?.description ?? "")
		return match ? match[1].trim() : null
	}

	async claim (channel: TextChannel, moderatorId: string, guildId: string): Promise<void> {
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
		await channel.permissionOverwrites.set([...currentPermissions, ...newPermissions])

		const firstMessage = await this.getFirstMessage(channel)
		const data: CreateClaimData = {
			guildId,
			moderatorId,
			ticketId: channel.id,
			affectedUserId: firstMessage ? this.extractAffectedUserId(firstMessage) : null,
			ticketReason: firstMessage ? this.extractReason(firstMessage) : null
		}
		await this.claimRepo.create(data)
	}

	async unclaim (channel: TextChannel, moderatorId: string, guildId: string): Promise<void> {
		await channel.permissionOverwrites.delete(moderatorId)
		await channel.permissionOverwrites.edit(moderatorRoleId, {
			SendMessages: true,
			ViewChannel: true
		})
		await this.claimRepo.unclaim(guildId, channel.id)
	}
}
