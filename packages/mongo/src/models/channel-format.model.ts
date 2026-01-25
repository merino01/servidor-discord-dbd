import { Schema, model, Document } from "mongoose"

export interface IChannelFormat extends Document {
	guildId: string
	channelId: string
	name: string
	pattern: string
	flags: string
	deleteMessage: boolean
	notifyUser: boolean
	isActive: boolean
	deletedBy?: string
	deletedAt?: Date
	createdAt: Date
	updatedAt: Date
}

const schema = new Schema<IChannelFormat>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		name: { type: String, required: true },
		pattern: { type: String, required: true },
		flags: { type: String, default: "" },
		deleteMessage: { type: Boolean, default: true },
		notifyUser: { type: Boolean, default: true },
		isActive: { type: Boolean, default: true },
		deletedBy: { type: String },
		deletedAt: { type: Date }
	},
	{ timestamps: true }
)

// Índice único por canal
schema.index({ guildId: 1, channelId: 1 }, { unique: true })

export const ChannelFormatModel = model<IChannelFormat>("ChannelFormat", schema)
