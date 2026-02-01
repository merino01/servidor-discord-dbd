import { Schema, model, Document } from "mongoose"

/**
 * Tipos de coincidencia para triggers
 */
export enum TriggerMatchType {
  /** Coincidencia exacta del mensaje completo */
  EXACT = "exact",
  /** La palabra/frase aparece en cualquier parte */
  CONTAINS = "contains",
  /** El mensaje empieza con la palabra/frase */
  STARTS_WITH = "startsWith",
  /** El mensaje termina con la palabra/frase */
  ENDS_WITH = "endsWith",
  /** La palabra aparece como palabra completa (con word boundaries) */
  WORD = "word",
  /** Usa expresión regular personalizada */
  REGEX = "regex"
}

export interface ITrigger extends Document {
  guildId: string;
  trigger: string;
  response: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  usageCount: number;
  isActive: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  deleteOriginalMessage: boolean;

  // Configuración de canales
  /** Array de IDs de canales. Si está vacío, aplica a todos los canales */
  channels: string[];
  /** Si true, el trigger NO aplica en los canales especificados (blacklist) */
  excludeChannels: boolean;

  // Configuración de coincidencia
  /** Tipo de coincidencia a usar */
  matchType: TriggerMatchType;
  /** Si debe ser case sensitive */
  caseSensitive: boolean;
  /** Expresión regular personalizada (solo si matchType es REGEX) */
  regexPattern?: string;
  /** Flags para la regex (ej: "gi", "i", "g") */
  regexFlags?: string;
}

const TriggerSchema = new Schema<ITrigger>({
	guildId: { type: String, required: true, index: true },
	trigger: { type: String, required: true },
	response: { type: String, required: true },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date },
	usageCount: { type: Number, default: 0 },
	isActive: { type: Boolean, default: true },
	deletedBy: { type: String },
	deletedAt: { type: Date	},
	deleteOriginalMessage: { type: Boolean, default: false },
	channels: { type: [String], default: [] },
	excludeChannels: { type: Boolean, default: false },
	matchType: { type: String, enum: Object.values(TriggerMatchType), default: TriggerMatchType.WORD },
	caseSensitive: { type: Boolean, default: false },
	regexPattern: { type: String, required: false },
	regexFlags: { type: String, required: false }
})

// Índice compuesto para búsquedas rápidas
TriggerSchema.index({ guildId: 1, trigger: 1 })

// Índice para búsquedas por canal
TriggerSchema.index({ guildId: 1, channels: 1 })

// Actualizar updatedAt automáticamente
TriggerSchema.pre("save", function () {
	if (this.isModified()) {
		this.updatedAt = new Date()
	}
})

export const TriggerModel = model<ITrigger>("trigger", TriggerSchema)

