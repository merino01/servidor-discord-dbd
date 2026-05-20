import { Message, TextChannel, GuildMember, VoiceState, Guild } from "discord.js"
import { UserStatsModel, IUserStats } from "@org/mongo"
import { botEvents } from "@/core/events/bot-events"
import { botLogger } from "@/core/logger"
import { BotInstance } from "@/core/bot-instance"
import { Injectable } from "@/core/container"
import { LevelRepository } from "../repositories/level.repository"

const statsLogger = botLogger.child("stats")

// Intervalo para guardar estadísticas de voz cada 5 minutos
const VOICE_STATS_SAVE_INTERVAL = 5 * 60 * 1000 // 5 minutos

// Cooldown map para mensajes (userId-guildId -> timestamp)
const messageXpCooldowns = new Map<string, number>()

interface LevelUpNotification {
	guild: Guild
	userId: string
	oldLevel: number
	newLevel: number
	fallbackChannel?: TextChannel
}

@Injectable(LevelRepository)
export class StatsTrakingListener {

	constructor (private readonly repository: LevelRepository) {}

	// eslint-disable-next-line max-lines-per-function
	register (): void {

		statsLogger.info("Stats tracking listeners initialized")

		// Iniciar el intervalo de guardado periódico (cada 5 minutos)
		setInterval(() => this.saveAllActiveVoiceStats(), VOICE_STATS_SAVE_INTERVAL)
		statsLogger.info(
			`Voice stats periodic save enabled (interval: ${VOICE_STATS_SAVE_INTERVAL / 1000}s)`
		)

		// Restaurar sesiones de voz al iniciar (después de 15 segundos para dar tiempo al bot)
		setTimeout(() => {
			this.restoreVoiceSessions().catch((error) => {
				statsLogger.error("Failed to restore voice sessions:", error)
			})
		}, 15000)

		/**
		* Listener de mensajes para trackear actividad de chat
		*/
		botEvents.on("message:created", async (message: Message) => {
			if (message.author.bot || !message.guild) {
				return
			}

			const userId = message.author.id
			const guildId = message.guild.id

			try {
				let stats = await UserStatsModel.findOne({ userId, guildId })

				if (!stats) {
					stats = new UserStatsModel({
						userId,
						guildId,
						messageCount: 0
					})
				}

				// Incrementar contador de mensajes
				stats.messageCount += 1
				stats.lastMessageAt = new Date()
				stats.lastActive = new Date()
				await stats.save()

				// Verificar cooldown para XP
				const cooldownKey = `${userId}-${guildId}`
				const now = Date.now()
				const lastMessageTime = messageXpCooldowns.get(cooldownKey) ?? 0

				if (now - lastMessageTime >= this.repository.getMessageCooldownMs()) {
					messageXpCooldowns.set(cooldownKey, now)

					const { leveledUp, oldLevel, newLevel } = await this.repository.addXp(
						userId,
						guildId,
						this.repository.getMessageXp()
					)

					if (leveledUp) {
						const channel = message.channel as TextChannel
						await this.notifyLevelUp({
							guild: message.guild,
							userId,
							oldLevel,
							newLevel,
							fallbackChannel: channel
						})
						statsLogger.info(
							`User ${userId} leveled up from ${oldLevel} to ${newLevel} in guild ${guildId}`
						)
					}
				}
			} catch (error) {
				statsLogger.error("Error tracking message stats:", error)
			}
		})

		/**
 * Listener de unión a canal de voz
 */
		botEvents.on("voice:join", async (member: GuildMember, voiceState: VoiceState) => {
			const userId = member.id
			const guildId = member.guild.id
			const channelId = voiceState.channelId

			if (!channelId) {
				return
			}

			try {
				let stats = await UserStatsModel.findOne({ userId, guildId })

				if (!stats) {
					stats = new UserStatsModel({
						userId,
						guildId
					})
				}

				stats.voiceJoinCount += 1
				stats.lastVoiceJoinAt = new Date()
				stats.currentVoiceChannelId = channelId
				stats.voiceSessionStart = new Date()
				stats.lastActive = new Date()

				await stats.save()
				statsLogger.debug(
					`User ${userId} joined voice channel ${channelId} in guild ${guildId}`
				)
			} catch (error) {
				statsLogger.error("Error tracking voice join:", error)
			}
		})

		/**
 * Listener de salida de canal de voz
 */
		botEvents.on("voice:leave", async (member: GuildMember) => {
			const userId = member.id
			const guildId = member.guild.id

			try {
				const stats = await UserStatsModel.findOne({ userId, guildId })

				if (!stats || !stats.voiceSessionStart) {
					return
				}

				// Calcular duración de la sesión
				const sessionEnd = new Date()
				const sessionDuration =
			sessionEnd.getTime() - stats.voiceSessionStart.getTime()
				const minutesInVoice = Math.floor(sessionDuration / 60000)

				if (minutesInVoice > 0) {
					stats.voiceMinutes += minutesInVoice

					// Añadir XP por tiempo en voz
					const voiceXp = minutesInVoice * this.repository.getVoiceXpPerMinute()
					const { leveledUp, oldLevel, newLevel } = await this.repository.addXp(
						userId,
						guildId,
						voiceXp
					)

					if (leveledUp) {
						await this.notifyLevelUp({
							guild: member.guild,
							userId,
							oldLevel,
							newLevel
						})

						statsLogger.info(
							// eslint-disable-next-line max-len
							`User ${userId} leveled up from ${oldLevel} to ${newLevel} in guild ${guildId} (voice activity)`
						)
					}
				}

				// Resetear estado de voz
				stats.currentVoiceChannelId = null
				stats.voiceSessionStart = null
				stats.lastActive = new Date()

				await stats.save()
				statsLogger.debug(
					`User ${userId} left voice, session duration: ${minutesInVoice} minutes`
				)
			} catch (error) {
				statsLogger.error("Error tracking voice leave:", error)
			}
		})

		/**
 * Listener de movimiento entre canales de voz
 */
		botEvents.on("voice:move", async (
			member: GuildMember,
			oldState: VoiceState,
			newState: VoiceState
		) => {
			const userId = member.id
			const guildId = member.guild.id

			try {
				const stats = await UserStatsModel.findOne({ userId, guildId })

				if (!stats || !stats.voiceSessionStart) {
					return
				}

				// Calcular duración en el canal anterior
				const moveTime = new Date()
				const sessionDuration =
			moveTime.getTime() - stats.voiceSessionStart.getTime()
				const minutesInVoice = Math.floor(sessionDuration / 60000)

				if (minutesInVoice > 0) {
					stats.voiceMinutes += minutesInVoice
					await this.processVoiceSessionXp(userId, guildId, member.guild, minutesInVoice)
				}

				// Actualizar al nuevo canal y reiniciar sesión
				const newChannelId = newState.channelId
				if (newChannelId) {
					stats.currentVoiceChannelId = newChannelId
				}
				stats.voiceSessionStart = moveTime
				stats.lastActive = new Date()

				await stats.save()

				const oldChannelId = oldState.channelId
				statsLogger.debug(
					// eslint-disable-next-line max-len
					`User ${userId} moved from channel ${oldChannelId} to ${newChannelId}, session: ${minutesInVoice} minutes`
				)
			} catch (error) {
				statsLogger.error("Error tracking voice move:", error)
			}
		})

		botEvents.on("command:executed", async (interaction) => {
			const userId = interaction.user.id
			const guildId = interaction.guildId

			try {
				const stats = await UserStatsModel.findOne({ userId, guildId })

				if (stats) {
					stats.commandsUsed += 1
					stats.lastActive = new Date()
					await stats.save()
				}
			} catch (error) {
				statsLogger.error(
					"Error tracking command usage:", error instanceof Error ? error.message : String(error)
				)
			}
		})
	}

	private async notifyLevelUp (options: LevelUpNotification): Promise<void> {
		const { guild, userId, newLevel, fallbackChannel } = options
		try {
			const channelId = this.repository.getLevelUpChannelId()
			let targetChannel: TextChannel | null = null

			if (channelId) {
				const channel = await guild.channels.fetch(channelId).catch(() => null)
				if (channel?.isTextBased()) {
					targetChannel = channel as TextChannel
				}
			}

			if (!targetChannel && fallbackChannel) {
				targetChannel = fallbackChannel
			}

			if (targetChannel) {
				await targetChannel.send(
					`🎉 <@${userId}> ¡Has subido al nivel **${newLevel}**!`
				)
			}
		} catch (error) {
			statsLogger.error("Error notificando subida de nivel:", error)
		}
	}

	/**
 * Guarda las estadísticas de voz de un usuario activo sin resetear la sesión
 */
	private async saveActiveVoiceStats (
		userId: string,
		guildId: string,
		guild: Guild,
		stats: IUserStats
	): Promise<void> {
		if (!stats.voiceSessionStart) {
			return
		}

		const now = new Date()
		const sessionDuration = now.getTime() - stats.voiceSessionStart.getTime()
		const minutesInVoice = Math.floor(sessionDuration / 60000)

		if (minutesInVoice <= 0) { return }
		// Añadir los minutos acumulados
		stats.voiceMinutes += minutesInVoice

		// Añadir XP por tiempo en voz
		const voiceXp = minutesInVoice * this.repository.getVoiceXpPerMinute()
		const { leveledUp, oldLevel, newLevel } = await this.repository.addXp(
			userId,
			guildId,
			voiceXp
		)

		if (leveledUp) {
			await this.notifyLevelUp({
				guild,
				userId,
				oldLevel,
				newLevel
			})
			statsLogger.info(
				`User ${userId} leveled up from ${oldLevel} to ${newLevel} in guild ${guildId} (voice periodic save)`
			)
		}

		// Reiniciar el contador de sesión sin cerrar la sesión
		stats.voiceSessionStart = now
		stats.lastActive = now

		await stats.save()
		statsLogger.debug(
			`Saved ${minutesInVoice} minutes for user ${userId} in guild ${guildId} (still in voice)`
		)
	}

	private async saveAllActiveVoiceStats (): Promise<void> {
		try {
			const botInstance = BotInstance.getOrNull()
			if (!botInstance) {
				return
			}

			// Encontrar todos los usuarios con sesiones activas
			const activeStats = await UserStatsModel.find({
				voiceSessionStart: { $ne: null }
			})

			statsLogger.debug(
				`Processing ${activeStats.length} active voice sessions for periodic save`
			)

			for (const stats of activeStats) {
				try {
					const guild = botInstance.guilds.cache.get(stats.guildId)
					if (!guild) {
						continue
					}

					// Verificar que el usuario sigue en el canal
					const member = await guild.members.fetch(stats.userId).catch(() => null)
					if (!member?.voice?.channelId) {
					// El usuario ya no está en voz, limpiar la sesión
						stats.currentVoiceChannelId = null
						stats.voiceSessionStart = null
						await stats.save()
						statsLogger.debug(
							`Cleaned stale voice session for user ${stats.userId} in guild ${stats.guildId}`
						)
						continue
					}

					await this.saveActiveVoiceStats(stats.userId, stats.guildId, guild, stats)
				} catch (error) {
					statsLogger.error(
						`Error saving stats for user ${stats.userId} in guild ${stats.guildId}:`,
						error
					)
				}
			}
		} catch (error) {
			statsLogger.error("Error in saveAllActiveVoiceStats:", error)
		}
	}

	/**
 * Limpia o restaura una sesión de voz activa en la base de datos
 */
	private async cleanOrRestoreSession (
		stats: IUserStats,
		guild: Guild
	): Promise<"restored" | "cleaned"> {
		const member = await guild.members.fetch(stats.userId).catch(() => null)

		if (member?.voice?.channelId) {
		// El usuario sigue en el canal, guardar tiempo acumulado y reiniciar sesión
			await this.saveActiveVoiceStats(stats.userId, stats.guildId, guild, stats)
			statsLogger.info(
				`Restored voice session for user ${stats.userId} in guild ${stats.guildId}`
			)
			return "restored"
		} else {
		// El usuario ya no está en voz, limpiar la sesión
			stats.currentVoiceChannelId = null
			stats.voiceSessionStart = null
			await stats.save()
			statsLogger.debug(
				`Cleaned disconnected voice session for user ${stats.userId} in guild ${stats.guildId}`
			)
			return "cleaned"
		}
	}

	/**
 * Escanea los canales de voz de un servidor y crea sesiones para usuarios sin sesión activa
 */
	private async scanGuildVoiceChannels (guild: Guild): Promise<number> {
		let newSessionsCount = 0

		try {
			const voiceChannels = guild.channels.cache.filter(
				(channel) => channel.isVoiceBased()
			)

			for (const channel of voiceChannels.values()) {
				if (!("members" in channel)) {
					continue
				}

				for (const member of channel.members.values()) {
					if (member.user.bot) {
						continue
					}

					const userId = member.id
					const guildId = guild.id
					const channelId = channel.id

					let stats = await UserStatsModel.findOne({ userId, guildId })

					if (!stats) {
						stats = new UserStatsModel({ userId, guildId })
					}

					if (!stats.voiceSessionStart) {
						stats.voiceJoinCount += 1
						stats.lastVoiceJoinAt = new Date()
						stats.currentVoiceChannelId = channelId
						stats.voiceSessionStart = new Date()
						stats.lastActive = new Date()
						await stats.save()

						newSessionsCount++
						statsLogger.info(
							`Started new voice session for user ${userId} in channel ${channelId}`
						)
					}
				}
			}
		} catch (error) {
			statsLogger.error(
				`Error scanning voice channels in guild ${guild.id}:`,
				error
			)
		}

		return newSessionsCount
	}

	/**
 * Restaura sesiones de voz activas al iniciar el bot
 */
	private async restoreVoiceSessions (): Promise<void> {
		try {
			const botInstance = BotInstance.getOrNull()
			if (!botInstance) {
				statsLogger.warn("Bot instance not available for voice session restoration")
				return
			}

			let restoredCount = 0
			let newSessionsCount = 0
			let cleanedCount = 0

			// Paso 1: Limpiar/restaurar sesiones antiguas
			const activeStats = await UserStatsModel.find({
				voiceSessionStart: { $ne: null }
			})

			statsLogger.info(
				`Found ${activeStats.length} active sessions in database after restart`
			)

			for (const stats of activeStats) {
				try {
					const guild = botInstance.guilds.cache.get(stats.guildId)
					if (!guild) {
						stats.currentVoiceChannelId = null
						stats.voiceSessionStart = null
						await stats.save()
						cleanedCount++
						continue
					}

					const result = await this.cleanOrRestoreSession(stats, guild)
					if (result === "restored") {
						restoredCount++
					} else {
						cleanedCount++
					}
				} catch (error) {
					statsLogger.error(
						`Error restoring session for user ${stats.userId}:`,
						error
					)
				}
			}

			// Paso 2: Detectar usuarios que están en voz pero no tienen sesión activa
			for (const guild of botInstance.guilds.cache.values()) {
				const count = await this.scanGuildVoiceChannels(guild)
				newSessionsCount += count
			}

			statsLogger.info(
				`Restoration completed: ${restoredCount} restored, ${newSessionsCount} new, ${cleanedCount} cleaned`
			)
		} catch (error) {
			statsLogger.error("Error in restoreVoiceSessions:", error)
		}
	}

	private async processVoiceSessionXp (
		userId: string,
		guildId: string,
		guild: Guild,
		minutesInVoice: number
	): Promise<void> {
		const voiceXp = minutesInVoice * this.repository.getVoiceXpPerMinute()
		const { leveledUp, oldLevel, newLevel } = await this.repository.addXp(
			userId,
			guildId,
			voiceXp
		)

		if (leveledUp) {
			await this.notifyLevelUp({
				guild,
				userId,
				oldLevel,
				newLevel
			})
			statsLogger.info(
				`User ${userId} leveled up from ${oldLevel} to ${newLevel} in guild ${guildId} (voice move)`
			)
		}
	}
}
