import { Schema, model, Document } from "mongoose"

/**
 * Tipos de logs que se pueden configurar
 */
export enum LogType {
	COMMANDS = "commands",
	MESSAGES = "messages",
	VOICE = "voice",
	MODERATION = "moderation",
	MEMBERS = "members"
}

export interface ILogConfig extends Document {
	guildId: string

	// Configuración de logs de comandos
	commands: {
		enabled: boolean
		channelId?: string
	}

	// Configuración de logs de mensajes
	messages: {
		enabled: boolean
		channelId?: string
		logDeleted: boolean
		logEdited: boolean
	}

	// Configuración de logs de voz
	voice: {
		enabled: boolean
		channelId?: string
		logJoin: boolean
		logLeave: boolean
		logMove: boolean
	}

	// Configuración de logs de moderación
	moderation: {
		enabled: boolean
		channelId?: string
		logTimeouts: boolean
		logKicks: boolean
		logBans: boolean
	}

	// Configuración de logs de miembros
	members: {
		enabled: boolean
		channelId?: string
		logJoin: boolean
		logLeave: boolean
	}

	createdAt: Date
	updatedAt: Date
}

const LogConfigSchema = new Schema<ILogConfig>({
	guildId: { type: String, required: true, unique: true, index: true },

	commands: {
		enabled: { type: Boolean, default: false },
		channelId: { type: String }
	},

	messages: {
		enabled: { type: Boolean, default: false },
		channelId: { type: String },
		logDeleted: { type: Boolean, default: true },
		logEdited: { type: Boolean, default: true }
	},

	voice: {
		enabled: { type: Boolean, default: false },
		channelId: { type: String },
		logJoin: { type: Boolean, default: true },
		logLeave: { type: Boolean, default: true },
		logMove: { type: Boolean, default: true }
	},

	moderation: {
		enabled: { type: Boolean, default: false },
		channelId: { type: String },
		logTimeouts: { type: Boolean, default: true },
		logKicks: { type: Boolean, default: true },
		logBans: { type: Boolean, default: true }
	},

	members: {
		enabled: { type: Boolean, default: false },
		channelId: { type: String },
		logJoin: { type: Boolean, default: true },
		logLeave: { type: Boolean, default: true }
	},

	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date }
})

LogConfigSchema.pre("save", function () {
	if (this.isModified()) {
		this.updatedAt = new Date()
	}
})

export const LogConfigModel = model<ILogConfig>("LogConfig", LogConfigSchema)
