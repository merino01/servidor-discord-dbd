export default defineEventHandler(async (event) => {
	const { guildId } = getRouterParams(event)
	const session = await requireUserSession(event)

	const member = await $discordFetch({
		url: `/guilds/${guildId}/members/${session.user.discordId}`,
		useToken: "Bot"
	})

	const roles = await $discordFetch({
		url: `/guilds/${guildId}/roles`,
		useToken: "Bot"
	})

	return { member, serverRoles: roles }
})
