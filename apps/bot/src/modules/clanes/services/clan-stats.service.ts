import { ClanStatsModel, IClanStats, ClanModel } from "@org/mongo"
import { Types } from "mongoose"

export class ClanStatsService {
	/**
	 * Obtiene o crea las estadísticas de los últimos 30 días de un clan
	 */
	async getOrCreateCurrentStats (clanId: Types.ObjectId): Promise<IClanStats> {
		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			throw new Error("Clan not found")
		}

		// Buscar estadísticas del período actual (últimos 30 días)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		let stats = await ClanStatsModel.findOne({
			clanId,
			periodStart: { $gte: thirtyDaysAgo },
			periodEnd: null
		})

		if (!stats) {
			stats = await ClanStatsModel.create({
				clanId,
				guildId: clan.guildId,
				totalMessages: 0,
				totalVoiceMinutes: 0,
				totalMembers: clan.members.length,
				memberStats: new Map(),
				lastActivityAt: new Date(),
				periodStart: new Date(),
				periodEnd: null
			})
		}

		return stats
	}

	/**
	 * Registra un mensaje enviado en un canal de texto del clan
	 */
	async registerMessage (clanId: Types.ObjectId, userId: string): Promise<void> {
		const stats = await this.getOrCreateCurrentStats(clanId)

		stats.totalMessages += 1
		stats.lastActivityAt = new Date()

		const memberStats = stats.memberStats.get(userId) || {
			userId,
			messageCount: 0,
			voiceMinutes: 0,
			lastMessageAt: null,
			lastVoiceJoinAt: null
		}

		memberStats.messageCount += 1
		memberStats.lastMessageAt = new Date()

		stats.memberStats.set(userId, memberStats)
		await stats.save()
	}

	/**
	 * Registra tiempo de voz en un canal de voz del clan
	 */
	async registerVoiceTime (
		clanId: Types.ObjectId,
		userId: string,
		minutes: number
	): Promise<void> {
		const stats = await this.getOrCreateCurrentStats(clanId)

		stats.totalVoiceMinutes += minutes
		stats.lastActivityAt = new Date()

		const memberStats = stats.memberStats.get(userId) || {
			userId,
			messageCount: 0,
			voiceMinutes: 0,
			lastMessageAt: null,
			lastVoiceJoinAt: null
		}

		memberStats.voiceMinutes += minutes
		memberStats.lastVoiceJoinAt = new Date()

		stats.memberStats.set(userId, memberStats)
		await stats.save()
	}

	/**
	 * Obtiene las estadísticas de los últimos 30 días de un clan específico
	 */
	async getClanStats (clanId: Types.ObjectId): Promise<IClanStats | null> {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		return await ClanStatsModel.findOne({
			clanId,
			periodStart: { $gte: thirtyDaysAgo },
			periodEnd: null
		}).populate("clanId")
	}

	/**
	 * Obtiene el ranking de miembros por mensajes de un clan
	 */
	async getMemberMessageRanking (clanId: Types.ObjectId, limit = 10) {
		const stats = await this.getClanStats(clanId)
		if (!stats) {
			return []
		}

		const ranking = Array.from(stats.memberStats.entries())
			.map(([userId, data]) => ({
				userId,
				messageCount: data.messageCount,
				lastMessageAt: data.lastMessageAt
			}))
			.sort((a, b) => b.messageCount - a.messageCount)
			.slice(0, limit)

		return ranking
	}

	/**
	 * Obtiene el ranking de miembros por tiempo de voz de un clan
	 */
	async getMemberVoiceRanking (clanId: Types.ObjectId, limit = 10) {
		const stats = await this.getClanStats(clanId)
		if (!stats) {
			return []
		}

		const ranking = Array.from(stats.memberStats.entries())
			.map(([userId, data]) => ({
				userId,
				voiceMinutes: data.voiceMinutes,
				lastVoiceJoinAt: data.lastVoiceJoinAt
			}))
			.sort((a, b) => b.voiceMinutes - a.voiceMinutes)
			.slice(0, limit)

		return ranking
	}

	/**
	 * Obtiene el ranking de clanes por actividad de los últimos 30 días
	 */
	async getClanRankingByActivity (guildId: string, limit = 10) {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		return await ClanStatsModel.find({
			guildId,
			periodStart: { $gte: thirtyDaysAgo },
			periodEnd: null
		})
			.sort({ totalMessages: -1, totalVoiceMinutes: -1 })
			.limit(limit)
			.populate("clanId")
	}

	/**
	 * Actualiza el total de miembros de un clan
	 */
	async updateTotalMembers (clanId: Types.ObjectId): Promise<void> {
		const clan = await ClanModel.findById(clanId)
		if (!clan) {
			return
		}

		const stats = await this.getOrCreateCurrentStats(clanId)
		stats.totalMembers = clan.members.length
		await stats.save()
	}

	/**
	 * Cierra el período actual de estadísticas y crea uno nuevo
	 */
	async closeCurrentPeriod (clanId: Types.ObjectId): Promise<IClanStats> {
		const currentStats = await ClanStatsModel.findOne({
			clanId,
			periodEnd: null
		})

		if (currentStats) {
			currentStats.periodEnd = new Date()
			await currentStats.save()
		}

		// Crear nuevo período
		return await this.getOrCreateCurrentStats(clanId)
	}

	/**
	 * Limpia estadísticas de más de 30 días de todos los clanes
	 */
	async cleanOldStats (): Promise<void> {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		// Eliminar períodos cerrados de más de 30 días
		await ClanStatsModel.deleteMany({
			periodEnd: { $ne: null, $lt: thirtyDaysAgo }
		})

		// Resetear estadísticas actuales si tienen más de 30 días
		const oldStats = await ClanStatsModel.find({
			periodEnd: null,
			periodStart: { $lt: thirtyDaysAgo }
		})

		for (const stats of oldStats) {
			stats.totalMessages = 0
			stats.totalVoiceMinutes = 0
			stats.memberStats = new Map()
			stats.periodStart = new Date()
			await stats.save()
		}
	}
}

export const clanStatsService = new ClanStatsService()
