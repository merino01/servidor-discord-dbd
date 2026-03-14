import { Document, model, Schema } from "mongoose"
import { APIEmbed } from "discord.js"

export interface IWelcomeMessage extends Document {
	guildId: string
	enabled: boolean
	message?: string;
	embed?: APIEmbed | null;
	waitTime: number
}

const WelcomeMessageSchema = new Schema<IWelcomeMessage>({
	guildId: { type: String, required: true, index: true },
	enabled: { type: Boolean, required: true, default: true },
	message: { type: String, default: null },
	embed: { type: Schema.Types.Mixed, default: null },
	waitTime: { type: Number, default: 0 }
})

export const WelcomeMessageModel = model<IWelcomeMessage>("welcome_message", WelcomeMessageSchema)
