import { botEvents } from "@/core/events/bot-events"
import { ClanRepository } from "../repositories/clan.repository"
import { Injectable } from "@/core/container"

@Injectable(ClanRepository)
export class MemberLeaveEvent {
	constructor (private readonly repository: ClanRepository) {}

	private async handleMemberLeave ({ userId, guildId }: { userId: string, guildId: string }) {
		const userClan = await this.repository.getClanByMember(guildId, userId)
		if (userClan) {
			await this.repository.removeMember(
				userClan._id.toString(),
				userId,
				"system",
				true
			)
		}
	}

	register () {
		botEvents.on("member:leave", (member) => this.handleMemberLeave({
			userId: member.id,
			guildId: member.guild.id
		}))
		botEvents.on("member:ban", (guild, userId) => this.handleMemberLeave({ userId, guildId: guild.id }))
	}
}
