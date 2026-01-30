import { CronJob } from "cron"
import { botLogger } from "./logger"

const cronLogger = botLogger.child("cron")

const executeJob = (fn: () => void, cronName: string) => () => {
	cronLogger.info(`Ejecutando cron: ${cronName}`)
	fn()
}

export const scheduleCronJob = (cronExpression: string, fn: () => void, cronName: string) => {
	new CronJob(cronExpression, executeJob(fn, cronName), null, true, "Europe/Madrid")
}
