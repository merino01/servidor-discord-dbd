import { Schema, model, Document } from "mongoose"

export interface IGuildSettings extends Document {
  guildId: string;
  prefix?: string;
  language: string;
  modRoles: string[];
  logChannel?: string;
  welcomeChannel?: string;
  welcomeMessage?: string;
  autoModEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GuildSettingsSchema = new Schema<IGuildSettings>(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		prefix: { type: String, default: "!" },
		language: { type: String, default: "es" },
		modRoles: [{ type: String }],
		logChannel: { type: String },
		welcomeChannel: { type: String },
		welcomeMessage: { type: String },
		autoModEnabled: { type: Boolean, default: false }
	},
	{ timestamps: true }
)

export const GuildSettingsModel = model<IGuildSettings>("guild_settings", GuildSettingsSchema)
