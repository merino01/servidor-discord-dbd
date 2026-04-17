import { ChannelFormatModel } from "@org/mongo"

export default defineEventHandler(async (event) => {
	const queryParams = getQuery(event)
	const guildId = queryParams.guildId as string

	const formats = await ChannelFormatModel.find({ guildId, isActive: true }).lean()
	return formats
})
