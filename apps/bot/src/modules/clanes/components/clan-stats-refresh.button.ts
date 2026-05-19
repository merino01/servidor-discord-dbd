import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import { registerButton } from "@/core/components/component-registry"
import { ClanModel, IClanStats } from "@org/mongo"
import { clanStatsRepository } from "../repositories/clan-stats.repository"

function addGeneralStatsField (embed: EmbedBuilder, stats: IClanStats): void {
	const hours = Math.floor(stats.totalVoiceMinutes / 60)
	const minutes = stats.totalVoiceMinutes % 60

	embed.addFields({
		name: "📈 Estadísticas Generales",
		value: [
			`👥 **Miembros:** ${stats.totalMembers}`,
			`💬 **Mensajes:** ${stats.totalMessages.toLocaleString()}`,
			`🎤 **Tiempo en Voz:** ${hours}h ${minutes}m`,
			`📅 **Última Actividad:** <t:${Math.floor(stats.lastActivityAt.getTime() / 1000)}:R>`
		].join("\n"),
		inline: false
	})
}

async function addMessageRankingField (embed: EmbedBuilder, stats: IClanStats): Promise<void> {
	const messageRanking = await clanStatsRepository.getMemberMessageRanking(stats.clanId, 5)

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

async function addVoiceRankingField (embed: EmbedBuilder, stats: IClanStats): Promise<void> {
	const voiceRanking = await clanStatsRepository.getMemberVoiceRanking(stats.clanId, 5)

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

async function buildClanStatsEmbed (
	clanName: string,
	clanIcon: string,
	stats: IClanStats
): Promise<EmbedBuilder> {
	const embed = new EmbedBuilder()
		.setTitle(`📊 Estadísticas de ${clanIcon} ${clanName} (últimos 30 días)`)
		.setColor("#5865F2")
		.setTimestamp()

	addGeneralStatsField(embed, stats)
	await addMessageRankingField(embed, stats)
	await addVoiceRankingField(embed, stats)

	return embed
}

/**
 * Botón para refrescar las estadísticas de un clan
 * CustomId format: clan_stats_{action}_{clanId}
 */
registerButton("clan_stats", async (interaction: ButtonInteraction) => {
	const parts = interaction.customId.split("_")
	if (parts.length < 4) {
		return
	}

	const action = parts[2]
	if (action !== "refresh") {
		return
	}

	// clan_stats_refresh_{clanId}
	const clanId = parts.slice(3).join("_")

	try {
		await interaction.deferUpdate()

		const clan = await ClanModel.findById(clanId)
		if (!clan || !clan.isActive) {
			await interaction.followUp({
				content: "❌ El clan ya no existe o ha sido eliminado.",
				ephemeral: true
			})
			return
		}

		const stats = await clanStatsRepository.getClanStats(clan._id)
		if (!stats) {
			await interaction.followUp({
				content: "❌ No hay estadísticas disponibles para este clan.",
				ephemeral: true
			})
			return
		}

		const embed = await buildClanStatsEmbed(clan.name, clan.icon, stats)

		// Recrear el botón
		const button = new ButtonBuilder()
			.setCustomId(`clan_stats_refresh_${clanId}`)
			.setLabel("🔄 Refrescar")
			.setStyle(ButtonStyle.Secondary)

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

		await interaction.editReply({
			embeds: [embed],
			components: [row]
		})
	} catch (error) {
		console.error("Error refreshing clan stats:", error)
		await interaction.followUp({
			content: "❌ Error al actualizar las estadísticas.",
			ephemeral: true
		})
	}
})
