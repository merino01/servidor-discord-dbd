import { Schema, model, Document } from "mongoose"

export interface IChannelFormat extends Document {
	guildId: string
	channelId: string
	pattern: string
	flags: string
	deleteMessage: boolean
	notifyUser: boolean
	createdAt: Date
	updatedAt: Date
}

const schema = new Schema<IChannelFormat>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		pattern: { type: String, required: true },
		flags: { type: String, default: "" },
		deleteMessage: { type: Boolean, default: true },
		notifyUser: { type: Boolean, default: true }
	},
	{ timestamps: true }
)

// Índice único por canal
schema.index({ guildId: 1, channelId: 1 }, { unique: true })

export const ChannelFormatModel = model<IChannelFormat>("ChannelFormat", schema)
