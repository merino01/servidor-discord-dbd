import { Injectable } from "@/core/container"
import { Document, IRandomChannel, RandomChannelModel } from "@org/mongo"

@Injectable()
export class RandomChannelRepository{
	async saveChannel ({
		guildId,
		mainChannelId,
		channelIds,
		categoryId,
		excludeChannels }: Omit<IRandomChannel, keyof Document>) {
		RandomChannelModel.insertOne({
			guildId,
			mainChannelId,
			channelIds,
			categoryId,
			excludeChannels
		})
	}

	async findByMainChannelId (mainChannelId: string, guildId: string): Promise<IRandomChannel | null> {
		return await RandomChannelModel.findOne({
			guildId,
			mainChannelId
		})
	}

	async deleteByMainChannelId (mainChannelId: string, guildId: string): Promise<void> {
		await RandomChannelModel.deleteOne({
			guildId,
			mainChannelId
		})
	}
}
