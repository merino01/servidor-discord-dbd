import { TriggerModel } from "@org/mongo"

export default defineEventHandler(async (event) => {
	const queryParams = getQuery(event)
	const guildId = queryParams.guildId as string

	const triggers = await TriggerModel.find({ guildId, isActive: true }).lean()
	return triggers
})
