import { registerEvent } from "@/core/event-registry"
import { Events, GuildMember, PartialGuildMember } from "discord.js"
import { ClanService } from "../services/clan.service"

registerEvent(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
	const service = ClanService.getInstance()

	const userClan = await service.getClanByMember(
		member.guild.id,
		member.id
	)
	if (userClan) {
		await service.removeMember(
			userClan._id.toString(),
			member.id,
			member.client.user?.id || "system",
			true
		)
	}
})
