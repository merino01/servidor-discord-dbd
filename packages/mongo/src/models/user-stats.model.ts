import { Schema, model, Document } from "mongoose"

export interface IUserStats extends Document {
	userId: string
	guildId: string

	// Estadísticas de chat
	messageCount: number
	lastMessageAt: Date | null

	// Estadísticas de voz
	voiceMinutes: number
	voiceJoinCount: number
	lastVoiceJoinAt: Date | null
	currentVoiceChannelId: string | null
	voiceSessionStart: Date | null

	// Sistema de niveles
	level: number
	xp: number
	totalXp: number

	// Otras estadísticas
	commandsUsed: number
	warnings: number
	lastActive: Date

	createdAt: Date
	updatedAt: Date
}

const UserStatsSchema = new Schema<IUserStats>({
	userId: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },

	// Chat
	messageCount: { type: Number, default: 0 },
	lastMessageAt: { type: Date, default: null },

	// Voz
	voiceMinutes: { type: Number, default: 0 },
	voiceJoinCount: { type: Number, default: 0 },
	lastVoiceJoinAt: { type: Date, default: null },
	currentVoiceChannelId: { type: String, default: null },
	voiceSessionStart: { type: Date, default: null },

	// Niveles
	level: { type: Number, default: 1 },
	xp: { type: Number, default: 0 },
	totalXp: { type: Number, default: 0 },

	// Otros
	commandsUsed: { type: Number, default: 0 },
	warnings: { type: Number, default: 0 },
	lastActive: { type: Date, default: Date.now }
}, { timestamps: true })

// Índice compuesto para usuario + guild
UserStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true })

// Índices para rankings
UserStatsSchema.index({ guildId: 1, level: -1, xp: -1 })
UserStatsSchema.index({ guildId: 1, messageCount: -1 })
UserStatsSchema.index({ guildId: 1, voiceMinutes: -1 })

export const UserStatsModel = model<IUserStats>("user_stats", UserStatsSchema)
