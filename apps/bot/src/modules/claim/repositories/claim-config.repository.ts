import { Injectable } from "@/core/container"
import { ClaimConfigModel } from "@org/mongo"

@Injectable()
export class ClaimConfigRepository {
	async findAllByGuild (guildId: string): Promise<string[]> {
		const docs = await ClaimConfigModel.find(
			{ guildId },
			{ categoryId: 1, _id: 0 }
		)
		return docs.map((doc) => doc.categoryId)
	}

	async findByCategory (guildId: string, categoryId: string) {
		return ClaimConfigModel.findOne({ guildId, categoryId })
	}

	async create (guildId: string, categoryId: string) {
		return ClaimConfigModel.insertOne({ guildId, categoryId })
	}

	async delete (guildId: string, categoryId: string) {
		return ClaimConfigModel.findOneAndDelete({ guildId, categoryId })
	}
}
