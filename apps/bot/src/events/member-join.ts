import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"
import { Events, GuildMember } from "discord.js"

registerEvent(Events.GuildMemberAdd, (member: GuildMember) => {
	if (member.user.bot) { return }

	botEvents.emit("member:join", member)
})
