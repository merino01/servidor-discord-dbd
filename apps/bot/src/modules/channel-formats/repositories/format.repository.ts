import { Injectable } from "@/core/container"
import { ChannelFormatModel, IChannelFormat } from "@org/mongo"

export interface SaveFormatData {
	guildId: string
	channelId: string
	name: string
	pattern: string
	flags: string
	deleteMessage: boolean
	notifyUser: boolean
}

@Injectable()
export class FormatRepository {
	async upsert (data: SaveFormatData): Promise<void> {
		await ChannelFormatModel.findOneAndUpdate(
			{ guildId: data.guildId, channelId: data.channelId },
			data,
			{ upsert: true, new: true }
		)
	}

	async findByGuild (guildId: string, includeDeleted: boolean): Promise<IChannelFormat[]> {
		const filter: Record<string, unknown> = { guildId }
		filter.deletedAt = includeDeleted ? { $ne: null } : null
		return ChannelFormatModel.find(filter).sort({ createdAt: -1 })
	}

	async softDelete (formatId: string, guildId: string, deletedBy: string): Promise<IChannelFormat | null> {
		return ChannelFormatModel.findOneAndUpdate(
			{ _id: formatId, guildId, isActive: true },
			{ isActive: false, deletedBy, deletedAt: new Date() },
			{ new: false }
		)
	}

	async findById (formatId: string, guildId: string): Promise<IChannelFormat | null> {
		return ChannelFormatModel.findOne({ _id: formatId, guildId, deletedAt: null })
	}

	async setActive (formatId: string, isActive: boolean): Promise<IChannelFormat | null> {
		return ChannelFormatModel.findOneAndUpdate(
			{ _id: formatId },
			{ isActive },
			{ new: true }
		)
	}
}
