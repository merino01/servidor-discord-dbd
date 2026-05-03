import { Document, ILogConfig, LogConfigModel } from "@org/mongo"

export class LogsRepository {
	async getConfig (guildId: string): Promise<ILogConfig | null> {
		return await LogConfigModel.findOne({ guildId })
	}

	async createConfig
	(config: Omit<ILogConfig, keyof Document | "_id" | "createdAt" | "updatedAt">): Promise<ILogConfig> {
		return await LogConfigModel.create(config)
	}
}
