import { Document, model, Schema } from "mongoose"

export interface IClaimModel extends Document {
	guildId: string
	moderatorId: string
	affectedUserId: string | null
	ticketReason: string | null
	claimedAt: Date
}

const ClaimSchema = new Schema<IClaimModel>(
	{
		guildId: { type: String, required: true },
		moderatorId: { type: String, required: true },
		affectedUserId: { type: String, default: null },
		ticketReason: { type: String, default: null },
		claimedAt: { type: Date, default: new Date() }
	}
)

export const ClaimModel = model<IClaimModel>("claim", ClaimSchema)
