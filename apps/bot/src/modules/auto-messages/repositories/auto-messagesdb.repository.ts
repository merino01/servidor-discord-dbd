import { Injectable } from "@/core/container"
import { AutoMessageModel, Document, IAutoMessage } from "@org/mongo"
import { SortOrder } from "mongoose"

type createParams = Omit<IAutoMessage, keyof Document | "executionCount" | "createdAt" | "isActive">

@Injectable()
export class AutoMessagesDbRepository {
	async create (options: createParams): Promise<IAutoMessage> {
		return await AutoMessageModel.create({
			name: options.name,
			message: options.message,
			embed: options.embed,
			cronExpression: options.cronExpression,
			targetType: options.targetType,
			targetId: options.targetId,
			waitTime: options.waitTime,
			pin: options.pin,
			guildId: options.guildId,
			createdBy: options.createdBy
		})
	}

	async findById (id: string, guildId: string): Promise<IAutoMessage | null> {
		return await AutoMessageModel.findOne({ _id: id, guildId, deletedAt: null })
	}

	async find (
		filter: Record<string, unknown>,
		sort?: string | Record<string, SortOrder> | [string, SortOrder][]): Promise<IAutoMessage[]> {
		return await AutoMessageModel.find(filter).sort(sort)
	}

	async softDelete (id: string, guildId: string, userId: string): Promise<IAutoMessage | null> {
		return await AutoMessageModel.findOneAndUpdate(
			{
				_id: id,
				guildId,
				isActive: true
			},
			{
				isActive: false,
				deletedBy: userId,
				deletedAt: new Date()
			},
			{ new: false }
		)
	}
}
