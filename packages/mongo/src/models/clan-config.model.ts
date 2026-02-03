import { Schema, model, Document } from "mongoose"

export interface IClanConfig extends Document {
	guildId: string
	enabled: boolean
	leaderRoleId: string
	categoryVoiceId: string
	categoryTextId: string
	maxMembers: number
	maxExtraVoiceChannels: number
	color?: number
	invitationExpirationHours: number
	additionalRoleIds: string[]
	createdAt: Date
	updatedAt: Date
}

const ClanConfigSchema = new Schema<IClanConfig>({
	guildId: { type: String, required: true, unique: true, index: true },
	enabled: { type: Boolean, default: true },
	leaderRoleId: { type: String, required: true },
	categoryVoiceId: { type: String, required: true },
	categoryTextId: { type: String, required: true },
	maxMembers: { type: Number, default: 50, min: 1, max: 100 },
	maxExtraVoiceChannels: { type: Number, default: 3, min: 0, max: 10 },
	color: { type: Number },
	invitationExpirationHours: { type: Number, default: 24, min: 1, max: 168 },
	additionalRoleIds: { type: [String], default: [] },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date }
})

ClanConfigSchema.pre("save", function () {
	if (this.isModified()) {
		this.updatedAt = new Date()
	}
})

export const ClanConfigModel = model<IClanConfig>("clan_config", ClanConfigSchema)
