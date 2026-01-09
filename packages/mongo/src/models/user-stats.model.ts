import { Schema, model, Document } from "mongoose"

export interface IUserStats extends Document {
  userId: string;
  guildId: string;
  messageCount: number;
  commandsUsed: number;
  lastActive: Date;
  level: number;
  xp: number;
  warnings: number;
}

const UserStatsSchema = new Schema<IUserStats>({
	userId: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	messageCount: { type: Number, default: 0 },
	commandsUsed: { type: Number, default: 0 },
	lastActive: { type: Date, default: Date.now },
	level: { type: Number, default: 1 },
	xp: { type: Number, default: 0 },
	warnings: { type: Number, default: 0 }
})

// Índice compuesto para usuario + guild
UserStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true })

export const UserStatsModel = model<IUserStats>("UserStats", UserStatsSchema)
