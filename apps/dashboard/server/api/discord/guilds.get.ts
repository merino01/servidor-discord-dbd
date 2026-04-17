import { RedisKeys } from "@org/redis"

const GUILDS_URL = "/users/@me/guilds"
const USER_GUILDS_TTL = TimeUtils.minutesToSeconds(5)
const BOT_GUILDS_TTL = TimeUtils.minutesToSeconds(10)

const ADMINISTRATOR = 1n << 3n
const MANAGE_GUILD = 1n << 5n

function hasPermission (permissionsNew: string, flag: bigint) {
	const perms = BigInt(permissionsNew)
	return (perms & flag) === flag
}

export default defineEventHandler(async (event) => {
	const session = await requireUserSession(event)

	const [guilds, botGuilds] = await Promise.all([
		getOrSetCache(
			RedisKeys.discordUserGuilds(session.user.discordId),
			USER_GUILDS_TTL,
			() => $discordFetch<Guild[]>({ url: GUILDS_URL, session, useToken: "User" })
		),
		getOrSetCache(
			RedisKeys.discordBotGuilds(),
			BOT_GUILDS_TTL,
			() => $discordFetch<Guild[]>({ url: GUILDS_URL, useToken: "Bot" })
		)
	])

	const botGuildIds = new Set(botGuilds?.map((g) => g.id))

	return guilds?.
		map((guild) => ({
			...guild,
			hasAdmin: guild.owner || hasPermission(guild.permissions_new, ADMINISTRATOR),
			hasManageGuild: guild.owner || hasPermission(guild.permissions_new, MANAGE_GUILD),
			isBotInGuild: botGuildIds.has(guild.id)
		}))
		.sort((a, b) => {
			if (a.isBotInGuild !== b.isBotInGuild) {
				return a.isBotInGuild ? -1 : 1
			}
			return a.name.localeCompare(b.name)
		})
})
