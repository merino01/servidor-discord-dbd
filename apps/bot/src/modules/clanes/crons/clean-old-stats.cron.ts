import { scheduleCronJob } from "@/core/schedule-cron-job"
import { ClanStatsRepository } from "../repositories/clan-stats.repository"
import { Injectable } from "@/core/container"

@Injectable(ClanStatsRepository)
export class CleanOldStatsCron {
	constructor (private readonly statsRepository: ClanStatsRepository) {}

	async cleanOldStats (){
		try {
			await this.statsRepository.cleanOldStats()
			console.log("✅ Estadísticas antiguas de clanes limpiadas correctamente")
		} catch (error) {
			console.error("❌ Error al limpiar estadísticas antiguas de clanes:", error)
		}
	}
	register () {
		scheduleCronJob("0 0 3 * * *", this.cleanOldStats, "clean-old-clan-stats")
	}
}
