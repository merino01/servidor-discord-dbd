import { Schema, model, Document, Types } from "mongoose"

export enum ClanInvitationStatus {
	PENDING = "pending",
	ACCEPTED = "accepted",
	REJECTED = "rejected",
	EXPIRED = "expired"
}

export interface IClanInvitation extends Document {
	_id: Types.ObjectId
	clanId: Types.ObjectId
	guildId: string
	invitedUserId: string
	invitedBy: string
	status: ClanInvitationStatus
	createdAt: Date
	expiresAt: Date
	respondedAt?: Date
}

const ClanInvitationSchema = new Schema<IClanInvitation>({
	clanId: { type: Schema.Types.ObjectId, ref: "Clan", required: true },
	guildId: { type: String, required: true, index: true },
	invitedUserId: { type: String, required: true, index: true },
	invitedBy: { type: String, required: true },
	status: {
		type: String,
		enum: Object.values(ClanInvitationStatus),
		default: ClanInvitationStatus.PENDING
	},
	createdAt: { type: Date, default: Date.now },
	expiresAt: { type: Date, required: true },
	respondedAt: { type: Date }
})

ClanInvitationSchema.index({ clanId: 1, invitedUserId: 1, status: 1 })
ClanInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const ClanInvitationModel = model<IClanInvitation>("ClanInvitation", ClanInvitationSchema)
