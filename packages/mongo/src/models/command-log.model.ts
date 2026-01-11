import { Schema, model, Document } from "mongoose"

export interface ICommandLog extends Document {
	guildId: string
	userId: string
	username: string
	commandName: string
	commandPath: string
	options: Record<string, any>
	channelId: string
	success: boolean
	error?: string
	executedAt: Date
}

const CommandLogSchema = new Schema<ICommandLog>({
	guildId: { type: String, required: true, index: true },
	userId: { type: String, required: true, index: true },
	username: { type: String, required: true },
	commandName: { type: String, required: true, index: true },
	commandPath: { type: String, required: true },
	options: { type: Schema.Types.Mixed, default: {} },
	channelId: { type: String, required: true },
	success: { type: Boolean, default: true },
	error: { type: String },
	executedAt: { type: Date, default: Date.now, index: true }
})

// Índice compuesto para búsquedas
CommandLogSchema.index({ guildId: 1, executedAt: -1 })
CommandLogSchema.index({ userId: 1, executedAt: -1 })

export const CommandLogModel = model<ICommandLog>("CommandLog", CommandLogSchema)
