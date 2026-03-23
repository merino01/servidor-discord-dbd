import { Injectable } from "@/core/container"
import { IWelcomeMessage, WelcomeMessageModel } from "@org/mongo"

@Injectable()
export class WelcomeMessageRepository {

	async upsert (guildId: string, data: Partial<IWelcomeMessage>): Promise<IWelcomeMessage> {
		return await WelcomeMessageModel.findOneAndUpdate(
			{
				guildId
			},
			data,
			{
				upsert: true, new: true
			}
		)
	}

	async findByGuild (guildId: string): Promise <IWelcomeMessage |  null> {
		return await WelcomeMessageModel.findOne({
			guildId
		})
	}

	async delete (guildId: string): Promise<void> {
		await WelcomeMessageModel.deleteOne({ guildId })
	}
}
