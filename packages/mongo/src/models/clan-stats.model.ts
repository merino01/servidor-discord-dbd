import { Schema, model, Document, Types } from "mongoose"

export interface IClanMemberStats {
	userId: string
	messageCount: number
	voiceMinutes: number
	lastMessageAt: Date | null
	lastVoiceJoinAt: Date | null
}

export interface IClanStats extends Document {
	_id: Types.ObjectId
	clanId: Types.ObjectId
	guildId: string

	// Estadísticas generales del clan
	totalMessages: number
	totalVoiceMinutes: number
	totalMembers: number

	// Estadísticas por miembro
	memberStats: Map<string, IClanMemberStats>

	// Fechas
	lastActivityAt: Date
	periodStart: Date
	periodEnd: Date | null

	createdAt: Date
	updatedAt: Date
}

const ClanMemberStatsSchema = new Schema<IClanMemberStats>(
	{
		userId: { type: String, required: true },
		messageCount: { type: Number, default: 0 },
		voiceMinutes: { type: Number, default: 0 },
		lastMessageAt: { type: Date, default: null },
		lastVoiceJoinAt: { type: Date, default: null }
	},
	{ _id: false }
)

const ClanStatsSchema = new Schema<IClanStats>(
	{
		clanId: { type: Schema.Types.ObjectId, required: true, ref: "clan", index: true },
		guildId: { type: String, required: true, index: true },

		totalMessages: { type: Number, default: 0 },
		totalVoiceMinutes: { type: Number, default: 0 },
		totalMembers: { type: Number, default: 0 },

		memberStats: {
			type: Map,
			of: ClanMemberStatsSchema,
			default: new Map()
		},

		lastActivityAt: { type: Date, default: Date.now },
		periodStart: { type: Date, default: Date.now },
		periodEnd: { type: Date, default: null }
	},
	{ timestamps: true }
)

// Índices
ClanStatsSchema.index({ clanId: 1, periodEnd: 1 })
ClanStatsSchema.index({ guildId: 1, totalMessages: -1 })
ClanStatsSchema.index({ guildId: 1, totalVoiceMinutes: -1 })

export const ClanStatsModel = model<IClanStats>("clan_stats", ClanStatsSchema)
