import { ClanModel } from "@org/mongo"

export default defineEventHandler(async (event) => {
	const queryParams = getQuery(event)
	const guildId = queryParams.guildId as string

	const clans = await ClanModel.find({ guildId, isActive: true })
	return clans
})
