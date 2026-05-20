import { UserNotificationModel } from "@org/mongo"
import { EmbedBuilder, Message, PartialMessage } from "discord.js"
import { botLogger } from "@/core/logger"
import { botEvents } from "@/core/events/bot-events"

const notificatorLogger = botLogger.child("notificator")

export class NotificatorListener {
	async detectMention (message: Message) {
		const notifications = await UserNotificationModel.find({ guildId: message.guildId })

		const { content, channel } = message

		const notificationConfig = notifications.find((n) => n.regex.test(content) &&
		(n.excludeChannels
			? !n.channels.includes(channel.id)
			: (n.channels.length === 0 || n.channels.includes(channel.id)))
		)
		if (!notificationConfig) {
			return
		}

		notificatorLogger.info(
			`Usuario ${message.author.id} mencionado en guild ${
				message.guildId
			} por notificación configurada por ${notificationConfig.createdBy}`
		)

		const userToMention = await message.guild?.members.fetch(notificationConfig.mentionTo)
		if (!userToMention) {
			notificatorLogger.error(
				//eslint-disable-next-line max-len
				`No se pudo encontrar al usuario a mencionar ${notificationConfig.mentionTo} en el guild ${message.guildId}`
			)
			return
		}

		const embed = new EmbedBuilder()
			.setTitle("Nueva mención")
			.setColor("Blue")
			.setDescription(
				`Has sido mencionado en un mensaje por un usuario en el servidor **${message.guild?.name}**:\n\n` +
			`**Autor:** ${message.author.tag} (${message.author.id})\n` +
			`**Mensaje:** ${message.url}\n\n` +
			`**Contenido:**\n${message.content}`
			)
			.setTimestamp()

		await userToMention.send({ embeds: [embed] })
	}

	register () {
		botEvents.on("message:created", async (message) => {
			if (message.author.bot || !message.guildId) {return}

			try {
				await this.detectMention(message)
			} catch (error) {
				notificatorLogger.error("Error verificando triggers:", error)
			}
		})

		botEvents.on("message:edited", async (
			oldMessage: Message<boolean> | PartialMessage<boolean>,
			newMessage: Message<boolean> | PartialMessage<boolean>
		) => {
			if (newMessage.author?.bot || !newMessage.guildId) {return}
			try {
				await this.detectMention(newMessage as Message<boolean>)
			} catch (error) {
				notificatorLogger.error("Error verificando triggers en mensaje editado:", error)
			}
		})
	}
}
