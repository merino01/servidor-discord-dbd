import { UserNotificationModel } from "@org/mongo"

export default defineEventHandler(async (event) => {
	const queryParams = getQuery(event)
	const guildId = queryParams.guildId as string

	const notifications = await UserNotificationModel.find({ guildId, isActive: true }).lean()
	return notifications
})
