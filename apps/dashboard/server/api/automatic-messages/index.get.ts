import { AutoMessageModel } from "@org/mongo"

export default defineEventHandler(async (event) => {
	const queryParams = getQuery(event)
	const guildId = queryParams.guildId as string

	const automaticMessages = await AutoMessageModel.find({ guildId, isActive: true }).lean()
	return automaticMessages
})
