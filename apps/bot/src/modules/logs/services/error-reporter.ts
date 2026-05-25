import { BotInstance } from "@/core/bot-instance"
import { getConfig } from "@/core/config"
import { EmbedBuilder } from "discord.js"
import { LogConfigModel } from "@org/mongo"
import { logger } from "@org/logger"
import type { BotClient } from "@/core/bot-client"

const logsLogger = logger.child("logs:error-reporter")

interface ReportBotErrorData {
	error: unknown
	title: string
	context?: string
	guildId?: string
	client?: BotClient
}

function parseError (error: unknown): { name: string; message: string; stack?: string } {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message || "Sin mensaje",
			stack: error.stack
		}
	}

	let fallback = "Error desconocido"
	if (typeof error === "string") {
		fallback = error
	} else {
		try {
			fallback = JSON.stringify(error)
		} catch {
			fallback = String(error)
		}
	}
	return {
		name: "UnknownError",
		message: fallback || "Error desconocido"
	}
}

function truncate (value: string, maxLength: number): string {
	return value.length <= maxLength ? value : `${value.substring(0, maxLength - 3)}...`
}

async function sendToOwnerDm (
	data: ReportBotErrorData,
	parsed: { name: string; message: string; stack?: string }
): Promise<void> {
	const client = data.client ?? BotInstance.getOrNull()
	if (!client) {
		return
	}

	const ownerId = getConfig().bot.ownerId
	if (!ownerId) {
		return
	}

	try {
		const owner = await client.users.fetch(ownerId)
		if (!owner) {
			return
		}

		const stack = parsed.stack ? truncate(parsed.stack, 1800) : "Sin stacktrace"
		await owner.send({
			content: `🚨 **${data.title}**\n${data.context ? `${data.context}\n` : ""}\`\`\`\n${stack}\n\`\`\``
		})
	} catch (error) {
		logsLogger.error("No se pudo enviar el error por DM al owner:", error)
	}
}

async function getErrorChannel (client: BotClient, guildId?: string) {
	if (!guildId) {
		return null
	}

	const config = await LogConfigModel.findOne({ guildId })
	if (!config?.botErrors?.enabled || !config.botErrors.channelId) {
		return null
	}

	const channel = await client.channels.fetch(config.botErrors.channelId).catch(() => null)
	if (!channel?.isTextBased() || !("send" in channel)) {
		return null
	}

	return channel
}

export async function reportBotError (data: ReportBotErrorData): Promise<void> {
	const parsed = parseError(data.error)
	const client = data.client ?? BotInstance.getOrNull()

	if (!client) {
		await sendToOwnerDm(data, parsed)
		return
	}

	try {
		const channel = await getErrorChannel(client, data.guildId)
		if (!channel || !data.guildId) {
			await sendToOwnerDm(data, parsed)
			return
		}

		const stack = truncate(parsed.stack || parsed.message, 1000)
		const embed = new EmbedBuilder()
			.setColor(0xed4245)
			.setTitle(`🚨 ${data.title}`)
			.addFields(
				{ name: "Tipo", value: `\`${truncate(parsed.name, 200)}\``, inline: true },
				{ name: "Guild", value: data.guildId, inline: true },
				{ name: "Mensaje", value: `\`\`\`${truncate(parsed.message, 1000)}\`\`\`` },
				{ name: "Stacktrace", value: `\`\`\`${stack}\`\`\`` }
			)
			.setTimestamp()

		if (data.context) {
			embed.setDescription(truncate(data.context, 2048))
		}

		await channel.send({ embeds: [embed] })
	} catch (error) {
		logsLogger.error("Error enviando notificación de error del bot:", error)
	}
}
