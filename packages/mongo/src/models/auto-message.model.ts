import { Schema, model, Document } from "mongoose"

export enum AutoMessageTargetType {
  CHANNEL = "channel",
  CATEGORY = "category"
}

export interface IAutoMessage extends Document {
  guildId: string;
  name: string;
  message: string | null;
	embed: Record<string, unknown> | null;
  cronExpression: string | null;
  targetType: AutoMessageTargetType;
  targetId: string;
	waitTime: number;
	pin: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  lastExecutionAt?: Date;
  executionCount: number;
}

const AutoMessageSchema = new Schema<IAutoMessage>({
	guildId: { type: String, required: true, index: true },
	name: { type: String, required: true },
	message: { type: String, default: null },
	embed: { type: Schema.Types.Mixed, default: null },
	cronExpression: { type: String, default: null },
	targetType: { type: String, enum: Object.values(AutoMessageTargetType), required: true },
	targetId: { type: String, required: true },
	waitTime: { type: Number, default: 0 },
	pin: { type: Boolean, default: false },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date },
	isActive: { type: Boolean, default: true },
	deletedBy: { type: String },
	deletedAt: { type: Date },
	lastExecutionAt: { type: Date },
	executionCount: { type: Number, default: 0 }
})

AutoMessageSchema.index({ guildId: 1, isActive: 1 })
AutoMessageSchema.index({ targetType: 1, targetId: 1 })

AutoMessageSchema.pre("save", function () {
	if (this.isModified()) {
		this.updatedAt = new Date()
	}
})

export const AutoMessageModel = model<IAutoMessage>("auto_message", AutoMessageSchema)
