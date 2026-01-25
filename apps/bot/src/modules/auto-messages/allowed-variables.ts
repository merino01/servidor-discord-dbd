import { TextChannel, GuildMember, User, Guild } from "discord.js"

export interface VariableContext {
	channel?: TextChannel;
	guild?: Guild;
	creator?: User | GuildMember;
}

export const ALLOWED_VARIABLES = {
	// Canal
	"@@channel_name@@": "Nombre del canal",
	"@@channel_id@@": "ID del canal",
	"@@channel_mention@@": "Mención del canal",

	// Guild/Servidor
	"@@server_name@@": "Nombre del servidor",
	"@@server_id@@": "ID del servidor",
	"@@server_member_count@@": "Cantidad de miembros",

	// Creador del canal (cuando se crea un nuevo canal)
	"@@creator_name@@": "Nombre del usuario que creó el canal",
	"@@creator_mention@@": "Mención del usuario que creó el canal",
	"@@creator_id@@": "ID del usuario que creó el canal",

	// Fecha/hora
	"@@date@@": "Fecha actual (DD/MM/YYYY)",
	"@@time@@": "Hora actual (HH:MM)",
	"@@datetime@@": "Fecha y hora (DD/MM/YYYY HH:MM)"
} as const

export function replaceVariables (text: string, context: VariableContext): string {
	let result = text

	// Variables de canal
	if (context.channel) {
		result = result.replace(/@@channel_name@@/g, context.channel.name)
		result = result.replace(/@@channel_id@@/g, context.channel.id)
		result = result.replace(/@@channel_mention@@/g, `<#${context.channel.id}>`)
	}

	// Variables de guild
	if (context.guild) {
		result = result.replace(/@@server_name@@/g, context.guild.name)
		result = result.replace(/@@server_id@@/g, context.guild.id)
		result = result.replace(/@@server_member_count@@/g, context.guild.memberCount.toString())
	}

	// Variables de creador
	if (context.creator) {
		const user = context.creator instanceof GuildMember ? context.creator.user : context.creator
		const displayName = context.creator instanceof GuildMember
			? context.creator.displayName
			: user.username

		result = result.replace(/@@creator_name@@/g, displayName)
		result = result.replace(/@@creator_mention@@/g, `<@${user.id}>`)
		result = result.replace(/@@creator_id@@/g, user.id)
	}

	// Variables de fecha/hora
	const now = new Date()
	const dateStr = now.toLocaleDateString("es-ES")
	const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
	const datetimeStr = `${dateStr} ${timeStr}`

	result = result.replace(/@@date@@/g, dateStr)
	result = result.replace(/@@time@@/g, timeStr)
	result = result.replace(/@@datetime@@/g, datetimeStr)

	return result
}

export function replaceVariablesInEmbed (
	embed: Record<string, unknown>,
	context: VariableContext
): Record<string, unknown> {
	const processValue = (value: unknown): unknown => {
		if (typeof value === "string") {
			return replaceVariables(value, context)
		}
		if (Array.isArray(value)) {
			return value.map(processValue)
		}
		if (value && typeof value === "object") {
			return replaceVariablesInObject(value as Record<string, unknown>)
		}
		return value
	}

	const replaceVariablesInObject = (obj: Record<string, unknown>): Record<string, unknown> => {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			result[key] = processValue(value)
		}
		return result
	}

	return replaceVariablesInObject(embed)
}

export function getVariablesList (): string {
	return Object.entries(ALLOWED_VARIABLES)
		.map(([variable, description]) => `\`${variable}\` - ${description}`)
		.join("\n")
}
