import { registerEvent } from "@/core/event-registry"
import { Events } from "discord.js"
import { ClanRepository } from "../repositories/clan.repository"

const handleMemberLeave = async ({ userId, guildId }: { userId: string, guildId: string }) => {
	const service = ClanRepository.getInstance()

	const userClan = await service.getClanByMember(guildId, userId)
	if (userClan) {
		await service.removeMember(
			userClan._id.toString(),
			userId,
			"system",
			true
		)
	}
}

registerEvent(Events.GuildMemberRemove, (member) => handleMemberLeave({ userId: member.id, guildId: member.guild.id }))
registerEvent(Events.GuildBanAdd, (ban) => handleMemberLeave({ userId: ban.user.id, guildId: ban.guild.id }))
