import { Injectable } from "@/core/container"
import { IUserStats, UserStatsModel } from "@org/mongo"

@Injectable()
export class StatsRepository {

	async findByUserId (userId: string, guildId: string): Promise<IUserStats | null> {
		return UserStatsModel.findOne({ userId, guildId })
	}

	async find (guildId: string, sort: Record<string, -1 | 1>, limit: number): Promise<IUserStats[]> {
		return await UserStatsModel.find({ guildId })
			.sort(sort)
			.limit(limit)
	}

	async getRank (guildId: string, level: number, totalXp: number): Promise<number> {
		return await UserStatsModel.countDocuments({
			guildId,
			$or: [
				{ level: { $gt: level } },
				{ level, totalXp: { $gt: totalXp } }
			]
		})
	}
}
