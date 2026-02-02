import { BaseCommand } from "@/core/base/base-command"
import {
	registerCommand,
	registerSubCommand
} from "@/core/command-register"
import { CommandContext, OptionType } from "@types"
import {
	EmbedBuilder,
	UserManager,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from "discord.js"
import { UserStatsModel } from "@org/mongo"
import { LevelService } from "../services/level.service"
import { botLogger } from "@/core/logger"

const statsLogger = botLogger.child("stats")

function createProgressBar (percentage: number): string {
	const filled = Math.floor(percentage / 10)
	const empty = 10 - filled
	return "█".repeat(filled) + "░".repeat(empty)
}

function formatMinutes (minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60

	if (hours > 0) {
		return `${hours}h ${mins}m`
	}
	return `${mins}m`
}

async function calculateLevelRank (guildId: string, level: number, totalXp: number): Promise<number> {
	const rankCount = await UserStatsModel.countDocuments({
		guildId,
		$or: [
			{ level: { $gt: level } },
			{ level, totalXp: { $gt: totalXp } }
		]
	})
	return rankCount + 1
}

async function buildProfileEmbed (
	userId: string,
	username: string,
	avatarUrl: string,
	guildId: string
): Promise<EmbedBuilder | null> {
	const stats = await UserStatsModel.findOne({ userId, guildId })

	if (!stats) {
		return null
	}

	const levelRank = await calculateLevelRank(guildId, stats.level, stats.totalXp)
	const { currentXp, xpForNext } = LevelService.getLevelProgress(stats.totalXp)
	const progressPercentage = Math.floor((currentXp / xpForNext) * 100)
	const progressBar = createProgressBar(progressPercentage)

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
				value: `**${formatMinutes(stats.voiceMinutes)}**`,
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

async function getRankingData (
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

function createRankingButtons (currentType: string): ActionRowBuilder<ButtonBuilder> {
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

async function buildRankingEmbed (
	guildId: string,
	guildName: string,
	rankingType: string,
	clientUsers: UserManager
): Promise<EmbedBuilder | null> {
	const { sortCriteria, title } = await getRankingData(guildId, rankingType)

	const topUsers = await UserStatsModel.find({ guildId })
		.sort(sortCriteria)
		.limit(10)

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
				value = formatMinutes(stat.voiceMinutes)
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

export class StatsCommand extends BaseCommand {
	async perfil (context: CommandContext): Promise<void> {
		const { interaction } = context

		await interaction.deferReply()

		const targetUser = interaction.options.getUser("usuario") ?? interaction.user

		const guildId = interaction.guildId
		if (!guildId) {
			await interaction.editReply({
				content: "❌ Este comando solo está disponible en servidores."
			})
			return
		}

		const embed = await buildProfileEmbed(
			targetUser.id,
			targetUser.username,
			targetUser.displayAvatarURL(),
			guildId
		)

		if (!embed) {
			const noStatsMsg = targetUser.id === interaction.user.id
				? "No tienes"
				: `${targetUser.username} no tiene`
			await interaction.editReply({
				content: `❌ ${noStatsMsg} estadísticas registradas aún.`
			})
			return
		}

		await interaction.editReply({ embeds: [embed] })
		statsLogger.info(
			`User ${interaction.user.id} viewed profile for ${targetUser.id}`
		)
	}

	async ranking (context: CommandContext): Promise<void> {
		const { interaction } = context

		await interaction.deferReply()

		const rankingType = "xp"
		const guildId = interaction.guildId
		const guildName = interaction.guild?.name

		if (!guildId || !guildName) {
			await interaction.editReply({
				content: "❌ Este comando solo está disponible en servidores."
			})
			return
		}

		const embed = await buildRankingEmbed(
			guildId,
			guildName,
			rankingType,
			interaction.client.users
		)

		if (!embed) {
			await interaction.editReply({
				content: "❌ No hay estadísticas registradas en este servidor aún."
			})
			return
		}

		const buttons = createRankingButtons(rankingType)

		await interaction.editReply({ embeds: [embed], components: [buttons] })
		statsLogger.info(
			`User ${interaction.user.id} viewed ${rankingType} ranking`
		)
	}
}

registerCommand(StatsCommand, {
	name: "stats",
	description: "Ver estadísticas y niveles de usuarios",
	guildOnly: true
})

registerSubCommand(StatsCommand, "perfil", {
	name: "perfil",
	description: "Ver el perfil de estadísticas de un usuario",
	options: [
		{
			name: "usuario",
			description: "Usuario a consultar (vacío para ti mismo)",
			type: OptionType.USER,
			required: false
		}
	]
})

registerSubCommand(StatsCommand, "ranking", {
	name: "ranking",
	description: "Ver el ranking del servidor"
})
