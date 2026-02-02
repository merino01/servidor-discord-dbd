import { scheduleCronJob } from "@/core/schedule-cron-job"
import { clanStatsService } from "../services/clan-stats.service"

const cleanOldStats = async () => {
	try {
		await clanStatsService.cleanOldStats()
		console.log("✅ Estadísticas antiguas de clanes limpiadas correctamente")
	} catch (error) {
		console.error("❌ Error al limpiar estadísticas antiguas de clanes:", error)
	}
}

scheduleCronJob("0 0 3 * * *", cleanOldStats, "clean-old-clan-stats")
