import { Document, model, Schema } from "mongoose"

export interface IClaimConfigModel extends Document {
	guildId: string,
	categoryId: string
}

const ClaimConfigSchema = new Schema<IClaimConfigModel>({
	guildId: { type: String, required: true, index: true },
	categoryId: { type: String, required: true }
	 })

export const ClaimConfigModel = model<IClaimConfigModel>("claim_config", ClaimConfigSchema)
