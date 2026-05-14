import {
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationCommandOptionType
} from "discord.js"
import { BaseCommand } from "@/core/base/base-command"
import { registerCommand, registerSubCommand } from "@/core/command-register"
import { CommandContext } from "@types"
import { ClanModel, IClanStats } from "@org/mongo"
import { clanStatsService } from "../repositories/clan-stats.repository"

interface PopulatedClanStats extends Omit<IClanStats, "clanId"> {
	clanId: {
		name: string
		icon: string
	}
}

export class ClanStatsCommand extends BaseCommand {

	async clanStats (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				content: "Este comando solo puede ser usado en un servidor.",
				ephemeral: true
			})
			return
		}

		await interaction.deferReply()

		const clanRole = interaction.options.getRole("rol")
		if (!clanRole) {
			await interaction.editReply({
				content: "❌ Debes especificar el rol del clan."
			})
			return
		}

		const clan = await ClanModel.findOne({
			guildId: interaction.guild.id,
			roleId: clanRole.id,
			isActive: true
		})

		if (!clan) {
			await interaction.editReply({
				content: "❌ No se encontró el clan con ese rol."
			})
			return
		}

		const stats = await clanStatsService.getClanStats(clan._id)

		if (!stats) {
			await interaction.editReply({
				content: "❌ No hay estadísticas disponibles para este clan."
			})
			return
		}

		const embed = await this.buildClanStatsEmbed(clan.name, clan.icon, stats)

		// Crear botón de refrescar
		const button = new ButtonBuilder()
			.setCustomId(`clan_stats_refresh_${clan._id.toString()}`)
			.setLabel("🔄 Refrescar")
			.setStyle(ButtonStyle.Secondary)

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

		await interaction.editReply({ embeds: [embed], components: [row] })
	}

	async messageRanking (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				content: "Este comando solo puede ser usado en un servidor.",
				ephemeral: true
			})
			return
		}

		await interaction.deferReply()

		const clansStats = await clanStatsService.getClanRankingByActivity(
			interaction.guild.id,
			10
		) as unknown as PopulatedClanStats[]

		if (clansStats.length === 0) {
			await interaction.editReply({
				content: "❌ No hay estadísticas disponibles."
			})
			return
		}

		const embed = this.buildMessageRankingEmbed(clansStats)
		await interaction.editReply({ embeds: [embed] })
	}

	async voiceRanking (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				content: "Este comando solo puede ser usado en un servidor.",
				ephemeral: true
			})
			return
		}

		await interaction.deferReply()

		const clansStats = await clanStatsService.getClanRankingByActivity(
			interaction.guild.id,
			10
		) as unknown as PopulatedClanStats[]

		if (clansStats.length === 0) {
			await interaction.editReply({
				content: "❌ No hay estadísticas disponibles."
			})
			return
		}

		const embed = this.buildVoiceRankingEmbed(clansStats)
		await interaction.editReply({ embeds: [embed] })
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
		const messageRanking = await clanStatsService.getMemberMessageRanking(stats.clanId, 5)

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
		const voiceRanking = await clanStatsService.getMemberVoiceRanking(stats.clanId, 5)

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
}

registerCommand(ClanStatsCommand, {
	name: "clan-stats",
	description: "Ver estadísticas de clanes",
	permissions: PermissionFlagsBits.Administrator,
	guildOnly: true
})

registerSubCommand(ClanStatsCommand, "clanStats", {
	name: "clan",
	description: "Ver las estadísticas de un clan",
	options: [
		{
			name: "rol",
			description: "Rol del clan",
			type: ApplicationCommandOptionType.Role,
			required: true
		}
	]
})

registerSubCommand(ClanStatsCommand, "messageRanking", {
	name: "ranking-mensajes",
	description: "Ver ranking de clanes por mensajes",
	options: []
})

registerSubCommand(ClanStatsCommand, "voiceRanking", {
	name: "ranking-voz",
	description: "Ver ranking de clanes por tiempo en voz",
	options: []
})
