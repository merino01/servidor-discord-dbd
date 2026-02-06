import { Document, model, Schema } from "mongoose"
import { APIEmbed } from "discord.js"

export interface IWelcomeMessage extends Document {
	guildId: string
	enabled: boolean
	message?: string;
	embed?: APIEmbed | null;
}

const WelcomeMessageSchema = new Schema<IWelcomeMessage>( {
	guildId: { type: String, required: true, index: true },
	enabled: { type: Boolean, required: true, default: false },
	message: { type: String, default: null },
	embed: { type: Schema.Types.Mixed, default: null }
})

export const WelcomeMessageModel = model<IWelcomeMessage>("welcome_message", WelcomeMessageSchema)
