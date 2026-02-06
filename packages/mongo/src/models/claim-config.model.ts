import { Document, model, Schema } from "mongoose"

export interface IClaimConfigModel extends Document {
	guildId: string,
	categories: [string]
}

const ClaimConfigSchema = new Schema<IClaimConfigModel>(
	 {
		guildId: { type: String, required: true, unique: true, index: true },
		categories: { type: [String], default: [] }
	 }
)

export const ClaimConfigModel = model<IClaimConfigModel>("claim_config", ClaimConfigSchema)
