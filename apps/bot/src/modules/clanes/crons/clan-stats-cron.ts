import { scheduleCronJob } from "@/core/schedule-cron-job"
import { UserStatsModel, ClanModel } from "@org/mongo"

export class ClanStatsCron {
	/**
	* Consulta y agrupa estadísticas mensuales por clan para el mes anterior.
	* Ejecuta cada día 1 a las 10:00 AM.
	*/
	private async getClanStatsForLastMonth () {
		const now = new Date()
		const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
		const month = now.getMonth() === 0 ? 12 : now.getMonth() // 1-12
		const guilds = await ClanModel.distinct("guildId", { isActive: true })

		for (const guildId of guilds) {
			const clanes = await ClanModel.find({ guildId, isActive: true })
			const start = new Date(year, month - 1, 1)
			const end = new Date(year, month, 1)

			for (const clan of clanes) {
				const stats = await UserStatsModel.aggregate([
					{
						$match: {
							guildId,
							userId: { $in: clan.members },
							lastActive: { $gte: start, $lt: end }
						}
					},
					{
						$project: {
							userId: 1,
							messageCount: 1,
							voiceMinutes: 1,
							xp: 1,
							totalXp: 1
						}
					}
				])

				const totalMensajes = stats.reduce((a, s) => a + s.messageCount, 0)
				const totalVoz = stats.reduce((a, s) => a + s.voiceMinutes, 0)
				const totalXp = stats.reduce((a, s) => a + s.xp, 0)
				const mediaXp = stats.length ? totalXp / stats.length : 0
				const topMensajes = stats.sort((a, b) => b.messageCount - a.messageCount)[0]
				const topVoz = stats.sort((a, b) => b.voiceMinutes - a.voiceMinutes)[0]
				const topXp = stats.sort((a, b) => b.xp - a.xp)[0]

				// Aquí puedes guardar o loguear el resultado, o integrarlo con otro sistema
				console.log({
					guildId,
					clan: clan.name,
					totalMensajes,
					totalVoz,
					totalXp,
					mediaXp,
					topMensajes,
					topVoz,
					topXp
				})
			}
		}
	}

	register () {
		scheduleCronJob("0 15 13 * * *", this.getClanStatsForLastMonth, "obtenerEstadisticasDeClanes")
	}
}
