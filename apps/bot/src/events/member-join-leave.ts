import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"
import { Events, GuildMember, PartialGuildMember } from "discord.js"

registerEvent(Events.GuildMemberAdd, (member: GuildMember) => {
	if (member.user.bot) { return }

	botEvents.emit("member:join", member)
})

registerEvent(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => {
	if (member.user.bot) { return }

	botEvents.emit("member:leave", member)
})
