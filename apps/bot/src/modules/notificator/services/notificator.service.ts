import { botLogger } from "@/core/logger"
import { CommandReply } from "@/core/types"
import { UserNotificationModel } from "@org/mongo"
import { User } from "discord.js"

interface Inputs {
	user: User
	patron: string
	canales?: string | null
	excludeChannels?: boolean | null
	guildId: string
	interactionUser: User
}

const notificatorLogger = botLogger.child("notificator")

export class NotificatorService {
	async createUserMentionNotification ({
		user,
		patron,
		canales,
		excludeChannels,
		guildId,
		interactionUser
	}: Inputs): Promise<CommandReply> {
		try {
			new RegExp(patron)
		} catch (error) {
			return {
				content: `El patrón no es una expresión regular válida: \`${
					error instanceof Error ? error.message : String(error)
				}\``
			}
		}
		const channelList = canales?.split(",").map((c) => c.trim()).filter((c) => c.length > 0)

		const newNotification = await UserNotificationModel.create({
			guildId,
			mentionTo: user.id,
			createdBy: interactionUser.id,
			regexPattern: patron,
			regexFlags: "ig",
			channels: channelList || [],
			excludeChannels: excludeChannels || false
		})
		notificatorLogger.info(
			`Nueva notificación de mención creada en guild ${
				guildId
			} para mencionar a ${user.id} por ${interactionUser.id}`
		)

		return {
			content: `Notificación creada correctamente para mencionar a ${user.tag} cuando se detecte el patrón \`${
				patron}\`. ID de la notificación: \`${newNotification._id}\``
		}
	}
}
