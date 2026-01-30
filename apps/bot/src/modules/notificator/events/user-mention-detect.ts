import { UserNotificationModel } from "@org/mongo"
import { registerEvent } from "@/core/event-registry"
import { EmbedBuilder, Events, Message, OmitPartialGroupDMChannel, PartialMessage } from "discord.js"
import { botLogger } from "@/core/logger"

const notificatorLogger = botLogger.child("notificator")

async function detectMention (message: Message) {
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

registerEvent(
	Events.MessageCreate,
	async (message: Message) => {
		if (message.author.bot || !message.guildId) {return}

		try {
			await detectMention(message)
		} catch (error) {
			notificatorLogger.error("Error verificando triggers:", error)
		}
	},
	{
		module: "triggers"
	}
)

registerEvent(
	Events.MessageUpdate,
	async (oldMessage: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>, newMessage: Message) => {
		if (newMessage.author?.bot || !newMessage.guildId) {return}
		try {
			await detectMention(newMessage)
		} catch (error) {
			notificatorLogger.error("Error verificando triggers en mensaje editado:", error)
		}
	},
	{
		module: "triggers"
	}
)
