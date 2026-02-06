import { Document, model, Schema } from "mongoose"

export interface IClaimModel extends Document {
	guildId: string
	userId: string
	ticket_count: number
	last_ticket_claimed: string
	last_ticket_date: Date
}

const ClaimSchema = new Schema<IClaimModel>(
	{
		guildId: { type: String, required: true, index: true },
		userId: { type: String, unique: true, required: true, index: true },
		ticket_count: { type: Number, default: 0 },
		last_ticket_claimed: { type: String },
		last_ticket_date: { type: Date, default: new Date() }
	}
)

export const ClaimModel = model<IClaimModel>("claim", ClaimSchema)
