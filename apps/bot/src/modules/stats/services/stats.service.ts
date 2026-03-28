import { Injectable } from "@/core/container"
import { LevelRepository } from "../repositories/level.repository"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, User, UserManager } from "discord.js"
import { StatsRepository } from "../repositories/stats.repository"
import { CommandReply } from "@/core/types"
import { botLogger } from "@/core/logger"

const statsLogger = botLogger.child("stats")

@Injectable(LevelRepository, StatsRepository)
export class StatsService {
	constructor (
		private readonly levelRepository: LevelRepository,
		private readonly statsRepository: StatsRepository) {}

	createProgressBar (percentage: number): string {
		const filled = Math.floor(percentage / 10)
		const empty = 10 - filled
		return "█".repeat(filled) + "░".repeat(empty)
	}
	formatMinutes (minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60

		if (hours > 0) {
			return `${hours}h ${mins}m`
		}
		return `${mins}m`
	}

	private async calculateLevelRank (guildId: string, level: number, totalXp: number): Promise<number> {
		const rankCount = await this.statsRepository.getRank(guildId, level, totalXp)
		return rankCount + 1
	}

	private async buildProfileEmbed (
		userId: string,
		username: string,
		avatarUrl: string,
		guildId: string
	): Promise<EmbedBuilder | null> {
		const stats = await this.statsRepository.findByUserId(userId, guildId)

		if (!stats) {
			return null
		}

		const levelRank = await this.calculateLevelRank(guildId, stats.level, stats.totalXp)
		const { currentXp, xpForNext } = this.levelRepository.getLevelProgress(stats.totalXp)
		const progressPercentage = Math.floor((currentXp / xpForNext) * 100)
		const progressBar = this.createProgressBar(progressPercentage)

		const embed = new EmbedBuilder()
			.setColor(0x3498db)
			.setTitle(`📊 Perfil de ${username}`)
			.setThumbnail(avatarUrl)
			.addFields(
				{
					name: "🎯 Nivel",
					value: `**${stats.level}** (#${levelRank} en el servidor)`,
					inline: true
				},
				{
					name: "✨ XP Total",
					value: `**${stats.totalXp.toLocaleString()}** XP`,
					inline: true
				},
				{
					name: "📈 Progreso",
					value: `${progressBar}\n${currentXp}/${xpForNext} XP (${progressPercentage}%)`,
					inline: false
				},
				{
					name: "💬 Mensajes",
					value: `**${stats.messageCount.toLocaleString()}** mensajes`,
					inline: true
				},
				{
					name: "🎤 Tiempo en Voz",
					value: `**${this.formatMinutes(stats.voiceMinutes)}**`,
					inline: true
				},
				{
					name: "🔊 Uniones a Voz",
					value: `**${stats.voiceJoinCount.toLocaleString()}** veces`,
					inline: true
				}
			)
			.setFooter({
				text: `Última actividad: ${stats.lastActive.toLocaleDateString("es-ES")}`
			})
			.setTimestamp()

		return embed
	}

	private async getRankingData (
		guildId: string,
		rankingType: string
	): Promise<{ sortCriteria: Record<string, -1 | 1>; title: string }> {
		let sortCriteria: Record<string, -1 | 1> = {}
		let title = ""

		if (rankingType === "mensajes") {
			sortCriteria = { messageCount: -1 }
			title = "💬 Ranking de Mensajes"
		} else if (rankingType === "voz") {
			sortCriteria = { voiceMinutes: -1 }
			title = "🎤 Ranking de Tiempo en Voz"
		} else {
			sortCriteria = { level: -1, totalXp: -1 }
			title = "🏆 Ranking de Niveles"
		}

		return { sortCriteria, title }
	}
	createRankingButtons (currentType: string): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("ranking:xp")
				.setLabel("🏆 Nivel")
				.setStyle(currentType === "xp" ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("ranking:mensajes")
				.setLabel("💬 Mensajes")
				.setStyle(
					currentType === "mensajes" ? ButtonStyle.Primary : ButtonStyle.Secondary
				),
			new ButtonBuilder()
				.setCustomId("ranking:voz")
				.setLabel("🎤 Voz")
				.setStyle(currentType === "voz" ? ButtonStyle.Primary : ButtonStyle.Secondary)
		)
	}

	async buildRankingEmbed (
		guildId: string,
		guildName: string,
		rankingType: string,
		clientUsers: UserManager
	): Promise<EmbedBuilder | null> {
		const { sortCriteria, title } = await this.getRankingData(guildId, rankingType)

		const topUsers = await this.statsRepository.find(guildId, sortCriteria, 10)

		if (topUsers.length === 0) {
			return null
		}

		const rankingText = await Promise.all(
			topUsers.map(async (stat, index) => {
				const user = await clientUsers.fetch(stat.userId)
				const medal = ["🥇", "🥈", "🥉"][index] ?? `${index + 1}.`

				let value = ""
				if (rankingType === "mensajes") {
					value = `${stat.messageCount.toLocaleString()} mensajes`
				} else if (rankingType === "voz") {
					value = this.formatMinutes(stat.voiceMinutes)
				} else {
					value = `Nivel ${stat.level} (${stat.totalXp.toLocaleString()} XP)`
				}

				return `${medal} **${user.username}** - ${value}`
			})
		)

		const embed = new EmbedBuilder()
			.setColor(0xf1c40f)
			.setTitle(title)
			.setDescription(rankingText.join("\n"))
			.setFooter({ text: guildName })
			.setTimestamp()

		return embed
	}

	// Funciones directas de los comandos
	public async profile (interactionUser: User, targetUser: User, guildId: string): Promise<CommandReply> {

		const embed = await this.buildProfileEmbed(
			targetUser.id,
			targetUser.username,
			targetUser.displayAvatarURL(),
			guildId
		)

		if (!embed) {
			const noStatsMsg = targetUser.id === interactionUser.id
				? "No tienes"
				: `${targetUser.username} no tiene`
			return { content: `❌ ${noStatsMsg} estadísticas registradas aún.` }
		}

		statsLogger.info(
			`User ${interactionUser.id} viewed profile for ${targetUser.id}`
		)
		return { embeds: [embed] }
	}

	async ranking (interactionUser: User,client: UserManager, guild: Guild): Promise<CommandReply> {
		const rankingType = "xp"

		const embed = await this.buildRankingEmbed(
			guild.id,
			guild.name,
			rankingType,
			client
		)
		if (!embed) {
			return {
				content: "❌ No hay estadísticas registradas en este servidor aún." }
		}
		const buttons = this.createRankingButtons(rankingType)

		statsLogger.info(`User ${interactionUser.id} viewed ${rankingType} ranking`)

		return { embeds: [embed], components: [buttons] }
	}
}
