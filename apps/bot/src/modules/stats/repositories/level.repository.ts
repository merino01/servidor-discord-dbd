import { UserStatsModel } from "@org/mongo"
import { getConfig } from "@/core/config"
import { Injectable } from "@/core/container"

@Injectable()
export class LevelRepository {
	// XP necesaria para alcanzar cada nivel (crecimiento exponencial)
	public getXpForLevel (level: number): number {
		return Math.floor(100 * Math.pow(level, 1.5))
	}

	// Calcula el nivel basado en XP total
	public calculateLevel (totalXp: number): number {
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
	public getLevelProgress (
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
	public async addXp (
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
	getMessageXp (): number {
		const config = getConfig()
		return config.features?.stats?.messageXp ?? 5
	}

	getVoiceXpPerMinute (): number {
		const config = getConfig()
		return config.features?.stats?.voiceXpPerMinute ?? 2
	}

	getMessageCooldownMs (): number {
		const config = getConfig()
		return config.features?.stats?.messageCooldownMs ?? 60_000
	}

	getLevelUpChannelId (): string | undefined {
		const config = getConfig()
		const channelId = config.features?.stats?.levelUpNotificationChannelId
		return channelId && channelId.trim() !== "" ? channelId : undefined
	}
}

