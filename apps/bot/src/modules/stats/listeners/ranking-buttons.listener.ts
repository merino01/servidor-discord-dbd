import { ButtonInteraction, EmbedBuilder } from "discord.js"
import { UserStatsModel } from "@org/mongo"
import { botLogger } from "@/core/logger"
import { registerButton } from "@/core/components/component-registry"

const statsLogger = botLogger.child("stats-buttons")

export class RankingButtonListener {

	register (): void {
		// Registrar handlers para cada botón
		registerButton("ranking:xp", async (interaction: ButtonInteraction) => {
			await this.handleRankingButton(interaction, "xp")
		})

		registerButton("ranking:mensajes", async (interaction: ButtonInteraction) => {
			await this.handleRankingButton(interaction, "mensajes")
		})

		registerButton("ranking:voz", async (interaction: ButtonInteraction) => {
			await this.handleRankingButton(interaction, "voz")
		})

		statsLogger.info("Ranking buttons registered")
	}

	private formatMinutes (minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60

		if (hours > 0) {
			return `${hours}h ${mins}m`
		}
		return `${mins}m`
	}

	private async getRankingData (
		guildId: string,
		rankingType: string
	): Promise<{ sortCriteria: Record<string, -1 | 1>; title: string }> {
		let sortCriteria: Record<string, -1 | 1> = {}
		let title = ""

		if (rankingType === "mensajes") {
			sortCriteria = { messageCount: -1 }
			title = "💬 Ranking de mensajes"
		} else if (rankingType === "voz") {
			sortCriteria = { voiceMinutes: -1 }
			title = "🎤 Ranking de tiempo en voz"
		} else {
			sortCriteria = { level: -1, totalXp: -1 }
			title = "🏆 Ranking de niveles"
		}

		return { sortCriteria, title }
	}

	private async buildRankingEmbed (
		interaction: ButtonInteraction,
		rankingType: string
	): Promise<EmbedBuilder | null> {
		const guildId = interaction.guildId
		const guildName = interaction.guild?.name

		if (!guildId || !guildName) {
			return null
		}

		const { sortCriteria, title } = await this.getRankingData(guildId, rankingType)

		const topUsers = await UserStatsModel.find({ guildId })
			.sort(sortCriteria)
			.limit(10)

		if (topUsers.length === 0) {
			return null
		}

		const rankingText = await Promise.all(
			topUsers.map(async (stat, index) => {
				const user = await interaction.client.users.fetch(stat.userId)
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
	createRankingButtons (
		currentType: string
	): {
	type: 1
	components: Array<{
		type: 2
		style: number
		label: string
		custom_id: string
		disabled?: boolean
	}>
} {
		const ButtonStyle = { Primary: 1, Secondary: 2 }
		return {
			type: 1,
			components: [
				{
					type: 2,
					style: currentType === "xp" ? ButtonStyle.Primary : ButtonStyle.Secondary,
					label: "🏆 Nivel",
					custom_id: "ranking:xp",
					disabled: currentType === "xp"
				},
				{
					type: 2,
					style:
					currentType === "mensajes"
						? ButtonStyle.Primary
						: ButtonStyle.Secondary,
					label: "💬 Mensajes",
					custom_id: "ranking:mensajes",
					disabled: currentType === "mensajes"
				},
				{
					type: 2,
					style: currentType === "voz" ? ButtonStyle.Primary : ButtonStyle.Secondary,
					label: "🎤 Voz",
					custom_id: "ranking:voz",
					disabled: currentType === "voz"
				}
			]
		}
	}

	private async handleRankingButton (
		interaction: ButtonInteraction,
		rankingType: string
	): Promise<void> {
		try {
			await interaction.deferUpdate()

			const embed = await this.buildRankingEmbed(interaction, rankingType)

			if (!embed) {
				await interaction.editReply({
					content: "❌ No hay estadísticas registradas en este servidor aún.",
					components: []
				})
				return
			}

			const buttons = this.createRankingButtons(rankingType)

			await interaction.editReply({
				embeds: [embed],
				components: [buttons]
			})

			statsLogger.info(
				`User ${interaction.user.id} switched to ${rankingType} ranking`
			)
		} catch (error) {
			statsLogger.error("Error handling ranking button:", error)
			await interaction.editReply({
				content: "❌ Error al cambiar el ranking.",
				components: []
			})
		}
	}
}
