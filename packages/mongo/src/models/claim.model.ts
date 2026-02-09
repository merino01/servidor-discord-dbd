import { Document, model, Schema } from "mongoose"

export interface IClaimModel extends Document {
	guildId: string
	moderatorId: string
	affectedUserId: string | null
	ticketReason: string | null
	ticketId: string
	claimedAt: Date
	unclaimedAt: Date | null
}

const ClaimSchema = new Schema<IClaimModel>({
	guildId: { type: String, required: true },
	moderatorId: { type: String, required: true },
	affectedUserId: { type: String, default: null },
	ticketReason: { type: String, default: null },
	ticketId: { type: String, required: true },
	claimedAt: { type: Date, default: new Date() },
	unclaimedAt: { type: Date, default: null }
})

export const ClaimModel = model<IClaimModel>("claim", ClaimSchema)
