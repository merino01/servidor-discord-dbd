import { Injectable } from "@/core/container"
import { ClanRepository } from "../repositories/clan.repository"
import { CommandReply } from "@/core/types"
import { ClanStatsRepository } from "../repositories/clan-stats.repository"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import { IClanStats } from "@org/mongo"

interface PopulatedClanStats extends Omit<IClanStats, "clanId"> {
	clanId: {
		name: string
		icon: string
	}
}

@Injectable(ClanRepository, ClanStatsRepository)
export class ClanStatsService {
	constructor (private readonly repository: ClanRepository, private readonly statsRepository: ClanStatsRepository) {}

	private async buildClanStatsEmbed (
		clanName: string,
		clanIcon: string,
		stats: IClanStats
	): Promise<EmbedBuilder> {
		const embed = new EmbedBuilder()
			.setTitle(`📊 Estadísticas de ${clanIcon} ${clanName} (últimos 30 días)`)
			.setColor("#5865F2")
			.setTimestamp()

		// Estadísticas generales
		this.addGeneralStatsField(embed, stats)

		// Top 5 mensajes
		await this.addMessageRankingField(embed, stats)

		// Top 5 voz
		await this.addVoiceRankingField(embed, stats)

		return embed
	}

	private addGeneralStatsField (embed: EmbedBuilder, stats: IClanStats): void {
		embed.addFields({
			name: "📈 Estadísticas Generales",
			value: [
				`👥 **Miembros:** ${stats.totalMembers}`,
				`💬 **Mensajes:** ${stats.totalMessages.toLocaleString()}`,
				`🎤 **Tiempo en Voz:** ${Math.floor(stats.totalVoiceMinutes / 60)}h ${stats.totalVoiceMinutes % 60}m`,
				`📅 **Última Actividad:** <t:${Math.floor(stats.lastActivityAt.getTime() / 1000)}:R>`
			].join("\n"),
			inline: false
		})
	}

	private async addMessageRankingField (embed: EmbedBuilder, stats: IClanStats): Promise<void> {
		const messageRanking = await this.statsRepository.getMemberMessageRanking(stats.clanId, 5)

		if (messageRanking.length > 0) {
			const messageRankingText = messageRanking
				.map((member, index) => {
					const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
					return `${medal} <@${member.userId}> - ${member.messageCount.toLocaleString()} mensajes`
				})
				.join("\n")

			embed.addFields({
				name: "💬 Top Mensajes",
				value: messageRankingText,
				inline: false
			})
		}
	}

	private async addVoiceRankingField (embed: EmbedBuilder, stats: IClanStats): Promise<void> {
		const voiceRanking = await this.statsRepository.getMemberVoiceRanking(stats.clanId, 5)

		if (voiceRanking.length > 0) {
			const voiceRankingText = voiceRanking
				.map((member, index) => {
					const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
					const hours = Math.floor(member.voiceMinutes / 60)
					const minutes = member.voiceMinutes % 60
					return `${medal} <@${member.userId}> - ${hours}h ${minutes}m`
				})
				.join("\n")

			embed.addFields({
				name: "🎤 Top Tiempo en Voz",
				value: voiceRankingText,
				inline: false
			})
		}
	}

	private createRefreshButton (clanId: string): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(`clan_stats_refresh_${clanId}`)
			.setLabel("🔄 Refrescar")
			.setStyle(ButtonStyle.Secondary)
	}

	// Directo al comando
	async clanStats (guildId: string, roleId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, roleId)
		if (!clan) {
			return { content: "❌ No se encontró el clan con ese rol." }
		}

		const stats = await this.statsRepository.getClanStats(clan._id)
		if (!stats) {
			return { content: "❌ No hay estadísticas disponibles para este clan." }
		}

		const embed = await this.buildClanStatsEmbed(clan.name, clan.icon, stats)
		const button = this.createRefreshButton(clan._id.toString())
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

		return { embeds: [embed], components: [row] }
	}

	private buildMessageRankingEmbed (clansStats: PopulatedClanStats[]): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle("🏆 Ranking de Clanes - Mensajes (últimos 30 días)")
			.setColor("#5865F2")
			.setTimestamp()

		const rankingText = clansStats
			.map((stats, index) => {
				const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
				return `${medal} **${stats.clanId.name}** - ${stats.totalMessages.toLocaleString()} mensajes`
			})
			.join("\n")

		embed.setDescription(rankingText)
		return embed
	}

	// Función directa al comando
	async messageRanking (guildId: string): Promise<CommandReply> {
		const clanStats = await this.statsRepository.getClanRankingByActivity(
			guildId,
			10
		) as unknown as PopulatedClanStats[]

		if (clanStats.length === 0) {
			return { content: "❌ No hay estadísticas disponibles." }
		}

		const embed = this.buildMessageRankingEmbed(clanStats)
		return { embeds: [embed] }
	}

	private buildVoiceRankingEmbed (clansStats: PopulatedClanStats[]): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle("🏆 Ranking de Clanes - Tiempo en Voz (últimos 30 días)")
			.setColor("#5865F2")
			.setTimestamp()

		const sortedStats = clansStats.sort((a, b) => b.totalVoiceMinutes - a.totalVoiceMinutes)

		const rankingText = sortedStats
			.map((stats, index) => {
				const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
				const hours = Math.floor(stats.totalVoiceMinutes / 60)
				const minutes = stats.totalVoiceMinutes % 60
				return `${medal} **${stats.clanId.name}** - ${hours}h ${minutes}m`
			})
			.join("\n")

		embed.setDescription(rankingText)
		return embed
	}

	// Función directa al comando
	async voiceRanking (guildId: string): Promise<CommandReply> {
		const clansStats = await this.statsRepository.getClanRankingByActivity(
			guildId,
			10
		) as unknown as PopulatedClanStats[]

		if (clansStats.length === 0) {
			return { content: "❌ No hay estadísticas disponibles." }
		}

		const embed = this.buildVoiceRankingEmbed(clansStats)
		return { embeds: [embed] }
	}
}
