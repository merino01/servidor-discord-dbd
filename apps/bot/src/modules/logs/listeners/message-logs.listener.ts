import { BotInstance } from "@/core/bot-instance"
import { Injectable } from "@/core/container"
import { botEvents } from "@/core/events/bot-events"
import { logger } from "@org/logger"
import { EmbedBuilder, Message, PartialMessage, TextChannel } from "discord.js"
import { LogsRepository } from "../repositories/logs.repository"

const logsLogger = logger.child("logs")

interface MessageDeletedEmbedData {
	channelId: string
	message: Message | PartialMessage
}

interface MessageEditedEmbedData {
	channelId: string
	oldMessage: Message | PartialMessage
	newMessage: Message | PartialMessage
}

@Injectable(LogsRepository)
export class MessageLogsListener {
	constructor (protected readonly repository: LogsRepository) {}

	private shouldLogMessage (message: Message | PartialMessage): boolean {
		return Boolean(message.guildId && message.author && !message.author.bot)
	}

	private async sendDeletedMessageEmbed (data: MessageDeletedEmbedData): Promise<void> {
		const bot = BotInstance.getOrNull()
		if (!bot || !data.message.author) {return}

		const channel = await bot.channels.fetch(data.channelId)
		if (!(channel instanceof TextChannel)) {return}

		const messageChannel = await bot.channels.fetch(data.message.channelId)
		if (!(messageChannel instanceof TextChannel)) {return}

		const embed = new EmbedBuilder()
			.setColor(0xed4245)
			.setTitle("🗑️ Mensaje eliminado")
			.addFields(
				{ name: "Usuario", value: `${data.message.author} (${data.message.author.tag})`, inline: true },
				{ name: "Canal", value: `<#${data.message.channelId}> (${messageChannel.name})`, inline: true },
				{ name: "ID Mensaje", value: data.message.id, inline: true }
			)
			.setTimestamp()

		if (data.message.content) {
			const content = data.message.content.length > 1024
				? data.message.content.substring(0, 1021) + "..."
				: data.message.content
			embed.addFields({ name: "Contenido", value: content })
		}

		if (data.message.attachments && data.message.attachments.size > 0) {
			const attachments = Array.from(data.message.attachments.values())
				.map((a) => `[${a.name}](${a.url})`)
				.join("\n")
			embed.addFields({ name: "Archivos adjuntos", value: attachments })
		}

		await (channel as TextChannel).send({ embeds: [embed] })
	}

	private async sendEditedMessageEmbed (data: MessageEditedEmbedData): Promise<void> {
		const bot = BotInstance.getOrNull()
		if (!bot || !data.newMessage.author) {return}

		const channel = await bot.channels.fetch(data.channelId)
		if (!(channel instanceof TextChannel)) {return}

		const messageChannel = await bot.channels.fetch(data.newMessage.channelId)
		if (!(messageChannel instanceof TextChannel)) {return}

		const embed = new EmbedBuilder()
			.setColor(0xffa500)
			.setTitle("✏️ Mensaje editado")
			.addFields(
				{ name: "Usuario", value: `${data.newMessage.author} (${data.newMessage.author.tag})`, inline: true },
				{ name: "Canal", value: `<#${data.newMessage.channelId}> (${messageChannel.name})`, inline: true },
				{ name: "ID Mensaje", value: data.newMessage.id, inline: true }
			)
			.setTimestamp()

		if (data.oldMessage.content) {
			const oldContent = data.oldMessage.content.length > 1024
				? data.oldMessage.content.substring(0, 1021) + "..."
				: data.oldMessage.content
			embed.addFields({ name: "Contenido anterior", value: oldContent })
		}

		if (data.newMessage.content) {
			const newContent = data.newMessage.content.length > 1024
				? data.newMessage.content.substring(0, 1021) + "..."
				: data.newMessage.content
			embed.addFields({ name: "Contenido nuevo", value: newContent })
		}

		if (data.newMessage.url) {
			embed.addFields({ name: "Link", value: `[Ir al mensaje](${data.newMessage.url})` })
		}

		await (channel as TextChannel).send({ embeds: [embed] })
	}

	register (): void {
		/**
		 * Listener de mensajes eliminados
		 * Envía embed al canal configurado
		 */
		botEvents.on("message:deleted", async (message: Message | PartialMessage) => {
			if (!this.shouldLogMessage(message)) {return}

			try {
				const config = await this.repository.getConfig(message.guildId!)
				const messagesConfig = config?.messages

				if (messagesConfig?.enabled && messagesConfig.logDeleted && messagesConfig.channelId) {
					await this.sendDeletedMessageEmbed({
						channelId: messagesConfig.channelId,
						message
					})
				}
			} catch (error) {
				logsLogger.error("Error procesando log de mensaje eliminado:", error)
			}
		})

		/**
		 * Listener de mensajes editados
		 * Envía embed al canal configurado
		 */
		botEvents.on("message:edited", async (
			oldMessage: Message | PartialMessage,
			newMessage: Message | PartialMessage
		) => {
			if (!this.shouldLogMessage(newMessage) || oldMessage.content === newMessage.content) {return}

			try {
				const config = await this.repository.getConfig(newMessage.guildId!)
				const messagesConfig = config?.messages

				if (messagesConfig?.enabled && messagesConfig.logEdited && messagesConfig.channelId) {
					await this.sendEditedMessageEmbed({
						channelId: messagesConfig.channelId,
						oldMessage,
						newMessage
					})
				}
			} catch (error) {
				logsLogger.error("Error procesando log de mensaje editado:", error)
			}
		})

		logsLogger.info("Listeners de logs de mensajes registrados")
	}
}
