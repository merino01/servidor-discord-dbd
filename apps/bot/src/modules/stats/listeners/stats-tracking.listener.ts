import { Message, TextChannel, GuildMember, VoiceState, Guild } from "discord.js"
import { UserStatsModel } from "@org/mongo"
import { botEvents } from "../../../core/events/bot-events"
import { LevelService } from "../services/level.service"
import { botLogger } from "../../../core/logger"

const statsLogger = botLogger.child("stats")

// Cooldown map para mensajes (userId-guildId -> timestamp)
const messageXpCooldowns = new Map<string, number>()

interface LevelUpNotification {
	guild: Guild
	userId: string
	oldLevel: number
	newLevel: number
	fallbackChannel?: TextChannel
}

async function notifyLevelUp (options: LevelUpNotification): Promise<void> {
	const { guild, userId, oldLevel, newLevel, fallbackChannel } = options
	try {
		const channelId = LevelService.getLevelUpChannelId()
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
				`🎉 <@${userId}> ¡Has subido al nivel **${newLevel}**! (antes: ${oldLevel})`
			)
		}
	} catch (error) {
		statsLogger.error("Error notificando subida de nivel:", error)
	}
}

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

		if (now - lastMessageTime >= LevelService.getMessageCooldownMs()) {
			messageXpCooldowns.set(cooldownKey, now)

			const { leveledUp, oldLevel, newLevel } = await LevelService.addXp(
				userId,
				guildId,
				LevelService.getMessageXp()
			)

			if (leveledUp) {
				const channel = message.channel as TextChannel
				await notifyLevelUp({
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
			const voiceXp = minutesInVoice * LevelService.getVoiceXpPerMinute()
			const { leveledUp, oldLevel, newLevel } = await LevelService.addXp(
				userId,
				guildId,
				voiceXp
			)

			if (leveledUp) {
				await notifyLevelUp({
					guild: member.guild,
					userId,
					oldLevel,
					newLevel
				})
				statsLogger.info(
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

async function processVoiceSessionXp (
	userId: string,
	guildId: string,
	guild: Guild,
	minutesInVoice: number
): Promise<void> {
	const voiceXp = minutesInVoice * LevelService.getVoiceXpPerMinute()
	const { leveledUp, oldLevel, newLevel } = await LevelService.addXp(
		userId,
		guildId,
		voiceXp
	)

	if (leveledUp) {
		await notifyLevelUp({
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
			await processVoiceSessionXp(userId, guildId, member.guild, minutesInVoice)
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
			`User ${userId} moved from channel ${oldChannelId} to ${newChannelId}, session: ${minutesInVoice} minutes`
		)
	} catch (error) {
		statsLogger.error("Error tracking voice move:", error)
	}
})

statsLogger.info("Stats tracking listeners initialized")

