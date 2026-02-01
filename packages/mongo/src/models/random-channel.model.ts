import { Document, model, Schema } from "mongoose"

export interface IRandomChannel extends Document {
	guildId: string
	mainChannelId: string
	categoryId: string | null
	channelIds: string[]
	excludeChannels: boolean
}

const RandomChannelSchema = new Schema<IRandomChannel>({
	guildId: { type: String, required: true },
	mainChannelId: { type: String, required: true },
	categoryId: { type: String, default: null },
	channelIds: { type: [String], default: [] },
	excludeChannels: { type: Boolean, default: false }
})

export const RandomChannelModel = model<IRandomChannel>("random_channel", RandomChannelSchema)
