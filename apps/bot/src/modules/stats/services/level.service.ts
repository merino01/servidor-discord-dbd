import { UserStatsModel } from "@org/mongo"
import { getConfig } from "@/core/config"

export class LevelService {
	// XP necesaria para alcanzar cada nivel (crecimiento exponencial)
	static getXpForLevel (level: number): number {
		return Math.floor(100 * Math.pow(level, 1.5))
	}

	// Calcula el nivel basado en XP total
	static calculateLevel (totalXp: number): number {
		let level = 1
		let xpRequired = this.getXpForLevel(level)

		while (totalXp >= xpRequired) {
			totalXp -= xpRequired
			level++
			xpRequired = this.getXpForLevel(level)
		}

		return level
	}

	// Obtiene XP actual y faltante para siguiente nivel
	static getLevelProgress (
		totalXp: number
	): { level: number; currentXp: number; xpForNext: number } {
		let level = 1
		let remainingXp = totalXp
		let xpRequired = this.getXpForLevel(level)

		while (remainingXp >= xpRequired) {
			remainingXp -= xpRequired
			level++
			xpRequired = this.getXpForLevel(level)
		}

		return {
			level,
			currentXp: remainingXp,
			xpForNext: xpRequired
		}
	}

	// Añade XP y verifica si subió de nivel
	static async addXp (
		userId: string,
		guildId: string,
		xpAmount: number
	): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number }> {
		let stats = await UserStatsModel.findOne({ userId, guildId })

		if (!stats) {
			stats = new UserStatsModel({ userId, guildId })
		}

		const oldLevel = stats.level
		stats.totalXp += xpAmount

		const { level: newLevel, currentXp } = this.getLevelProgress(stats.totalXp)

		stats.level = newLevel
		stats.xp = currentXp
		stats.lastActive = new Date()

		await stats.save()

		return {
			leveledUp: newLevel > oldLevel,
			oldLevel,
			newLevel
		}
	}

	// Obtiene configuración de XP desde config
	static getMessageXp (): number {
		const config = getConfig()
		return config.features?.stats?.messageXp ?? 5
	}

	static getVoiceXpPerMinute (): number {
		const config = getConfig()
		return config.features?.stats?.voiceXpPerMinute ?? 2
	}

	static getMessageCooldownMs (): number {
		const config = getConfig()
		return config.features?.stats?.messageCooldownMs ?? 60_000
	}

	static getLevelUpChannelId (): string | undefined {
		const config = getConfig()
		const channelId = config.features?.stats?.levelUpNotificationChannelId
		return channelId && channelId.trim() !== "" ? channelId : undefined
	}
}

