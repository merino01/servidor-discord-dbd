import { Schema, model, Document, Types } from "mongoose"

export interface IClan extends Document {
	_id: Types.ObjectId
	guildId: string
	name: string
	icon: string
	leaderIds: string[]
	roleId: string
	textChannelIds: string[]
	voiceChannelIds: string[]
	members: string[]
	createdAt: Date
	createdBy: string
}

const ClanSchema = new Schema<IClan>({
	guildId: { type: String, required: true, index: true },
	name: { type: String, required: true },
	icon: { type: String, required: true },
	leaderIds: [{ type: String }],
	roleId: { type: String, required: true },
	textChannelIds: [{ type: String, required: true }],
	voiceChannelIds: [{ type: String, required: true }],
	members: [{ type: String }],
	createdAt: { type: Date, default: Date.now },
	createdBy: { type: String, required: true }
})

ClanSchema.index({ guildId: 1, name: 1 }, { unique: true })
ClanSchema.index({ guildId: 1, roleId: 1 })

export const ClanModel = model<IClan>("Clan", ClanSchema)
