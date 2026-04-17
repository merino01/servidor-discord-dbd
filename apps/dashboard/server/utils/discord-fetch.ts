import type { UserSessionRequired } from "#auth-utils"
import { getConfig } from "@org/config"

const DISCORD_BASE_URL = "https://discord.com/api"

type UseToken =
	| "Bot"
	| "User"

interface Options {
	url: string
	session?: UserSessionRequired
	useToken?: UseToken
}

export function $discordFetch<T> ({ url, session, useToken = "Bot" }: Options): Promise<T> {
	const config = getConfig()

	return $fetch<T>(`${DISCORD_BASE_URL}${url}`, {
		headers: {
			Authorization: useToken === "Bot"
				? `Bot ${config.discord.token}`
				: `Bearer ${session?.secure?.accessToken}`
		}
	})
}
