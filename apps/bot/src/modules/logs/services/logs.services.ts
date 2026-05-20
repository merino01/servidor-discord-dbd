import { Injectable } from "@/core/container"
import { CommandReply } from "@/core/types"
import { LogsRepository } from "../repositories/logs.repository"
import { ILogConfig, LogType } from "@org/mongo"
import { buildConfigEmbed, buildViewEmbed } from "../util/embed"
import { GuildTextBasedChannel } from "discord.js"
import { botLogger } from "@/core/logger"

const logsLogger = botLogger.child("logs")

@Injectable(LogsRepository)
export class LogsService {
	constructor (protected readonly repository: LogsRepository) {}

	private async getOrCreateLogConfig (guildId: string) {
		let config = await this.repository.getConfig(guildId)

		if (!config) {
			config = await this.repository.createConfig({
				guildId,
				commands: { enabled: false },
				messages: { enabled: false, logDeleted: true, logEdited: true },
				voice: { enabled: false, logJoin: true, logLeave: true, logMove: true },
				moderation: { enabled: false, logTimeouts: true, logKicks: true, logBans: true },
				members: { enabled: false, logJoin: true, logLeave: true },
				clans: { enabled: false }
			})
		}

		return config
	}

	private updateLogConfig (
		config: ILogConfig,
		tipo: LogType,
		habilitado: boolean,
		canalId?: string
	): void {
		const configMap: Record<LogType, { enabled: boolean; channelId?: string }> = {
			[LogType.COMMANDS]: config.commands,
			[LogType.CLANS]: config.clans,
			[LogType.MESSAGES]: config.messages,
			[LogType.VOICE]: config.voice,
			[LogType.MODERATION]: config.moderation,
			[LogType.MEMBERS]: config.members
		}

		const targetConfig = configMap[tipo]
		targetConfig.enabled = habilitado
		if (canalId) {
			targetConfig.channelId = canalId
		}
	}

	// Función directa al comando
	async configure (
		guildId: string,
		type: LogType,
		enabled: boolean,
		channel?: GuildTextBasedChannel | null): Promise<CommandReply>{
		try {
			const config = await this.getOrCreateLogConfig(guildId)

			this.updateLogConfig(config, type, enabled, channel?.id)
			await config.save()

			logsLogger.info(
				`Logs de ${type} ${enabled ? "habilitados" : "deshabilitados"} en guild ${guildId}`
			)

			const embed = buildConfigEmbed(type, enabled, channel)
			return { embeds: [embed] }
		} catch (error) {
			logsLogger.error("Error configurando logs:", error)
			return { content: "❌ Error al configurar los logs." }
		}
	}

	async view (guildId: string): Promise<CommandReply> {
		try {
			const config = await this.repository.getConfig(guildId)

			if (!config) {
				return { content: "⚙️ No hay configuración de logs. Usa `/logs configurar` para empezar." }
			}

			const embed = buildViewEmbed(config)
			return { embeds: [embed] }
		} catch (error) {
			logsLogger.error("Error obteniendo configuración de logs:", error)
			return { content: "❌ Error al obtener la configuración de logs." }
		}
	}
}
