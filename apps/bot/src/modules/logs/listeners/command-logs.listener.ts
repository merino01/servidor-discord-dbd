import { BotInstance } from "@/core/bot-instance"
import { Injectable } from "@/core/container"
import { botEvents } from "@/core/events/bot-events"
import { logger } from "@org/logger"
import { CommandLogModel } from "@org/mongo"
import { ChatInputCommandInteraction, EmbedBuilder, TextChannel } from "discord.js"
import { LogsRepository } from "../repositories/logs.repository"

const logsLogger = logger.child("logs")

interface CommandLogData {
	interaction: ChatInputCommandInteraction
	commandPath: string
	options: Record<string, unknown>
	success: boolean
	error?: string
}

interface CommandEmbedData {
	channelId: string
	interaction: ChatInputCommandInteraction
	commandPath: string
	options: Record<string, unknown>
}

interface ErrorEmbedData {
	channelId: string
	interaction: ChatInputCommandInteraction
	error: Error
}

@Injectable(LogsRepository)
export class CommandLogsListener {
	constructor (protected readonly repository: LogsRepository) {}

	private async saveCommandLog (data: CommandLogData): Promise<void> {
		if (!data.interaction.guildId) {return}

		await CommandLogModel.create({
			guildId: data.interaction.guildId,
			userId: data.interaction.user.id,
			username: data.interaction.user.tag,
			commandName: data.interaction.commandName,
			commandPath: data.commandPath,
			options: data.options,
			channelId: data.interaction.channelId,
			success: data.success,
			...(data.error && { error: data.error })
		})
	}

	private async sendCommandLogEmbed (data: CommandEmbedData): Promise<void> {
		const bot = BotInstance.getOrNull()
		if (!bot) { return }

		const channel = await bot.channels.fetch(data.channelId)
		if (!channel?.isTextBased()) {return}

		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle("📝 Comando Ejecutado")
			.addFields(
				{ name: "Comando", value: `\`${data.commandPath}\``, inline: true },
				{ name: "Usuario", value: `${data.interaction.user} (${data.interaction.user.tag})`, inline: true },
				{ name: "Canal", value: `<#${data.interaction.channelId}>`, inline: true }
			)
			.setTimestamp()

		if (Object.keys(data.options).length > 0) {
			const optionsStr = Object.entries(data.options)
				.map(([key, value]) => `**${key}:** ${value}`)
				.join("\n")
			embed.addFields({ name: "Opciones", value: optionsStr })
		}

		await (channel as TextChannel).send({ embeds: [embed] })
	}

	private async sendCommandErrorEmbed (data: ErrorEmbedData): Promise<void> {
		const bot = BotInstance.getOrNull()
		if (!bot) {return}

		const channel = await bot.channels.fetch(data.channelId)
		if (!channel?.isTextBased()) {return}

		const embed = new EmbedBuilder()
			.setColor(0xed4245)
			.setTitle("❌ Error en Comando")
			.addFields(
				{ name: "Comando", value: `\`/${data.interaction.commandName}\``, inline: true },
				{ name: "Usuario", value: `${data.interaction.user} (${data.interaction.user.tag})`, inline: true },
				{ name: "Canal", value: `<#${data.interaction.channelId}>`, inline: true },
				{ name: "Error", value: `\`\`\`${data.error.message.substring(0, 1000)}\`\`\`` }
			)
			.setTimestamp()

		await (channel as TextChannel).send({ embeds: [embed] })
	}

	register (): void {
		/**
		 * Listener de logs de comandos
		 * Guarda en DB y envía embed al canal configurado
		 */
		botEvents.on("command:executed", async (interaction, commandPath, options) => {
			if (!interaction.guildId) {return}

			try {
				await this.saveCommandLog({ interaction, commandPath, options, success: true })

				const config = await this.repository.getConfig(interaction.guildId)

				if (config?.commands?.enabled && config.commands.channelId) {
					await this.sendCommandLogEmbed({
						channelId: config.commands.channelId,
						interaction,
						commandPath,
						options
					})
				}
			} catch (error) {
				logsLogger.error("Error procesando log de comando:", error)
			}
		})

		botEvents.on("command:error", async (interaction, error) => {
			if (!interaction.guildId) {return}

			try {
				await this.saveCommandLog({
					interaction,
					commandPath: `/${interaction.commandName}`,
					options: {},
					success: false,
					error: error.message
				})

				const config = await this.repository.getConfig(interaction.guildId)

				if (config?.commands?.enabled && config.commands.channelId) {
					await this.sendCommandErrorEmbed({
						channelId: config.commands.channelId,
						interaction,
						error
					})
				}
			} catch (err) {
				logsLogger.error("Error procesando log de error:", err)
			}
		})

		logsLogger.info("Listeners de logs de comandos registrados")

	}
}
