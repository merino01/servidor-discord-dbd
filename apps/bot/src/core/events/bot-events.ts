import { EventEmitter } from "node:events"
import {
	ChatInputCommandInteraction,
	Message,
	VoiceState,
	Guild,
	GuildMember,
	PartialMessage,
	PartialGuildMember
} from "discord.js"

/**
 * Tipos de eventos del bot
 */
export interface BotEvents {
	// Comandos
	"command:executed": [interaction: ChatInputCommandInteraction, commandPath: string, options: Record<string, any>]
	"command:error": [interaction: ChatInputCommandInteraction, error: Error]

	// Mensajes
	"message:created": [message: Message]
	"message:deleted": [message: Message]
	"message:edited": [oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage]

	// Voz
	"voice:join": [member: GuildMember, voiceState: VoiceState]
	"voice:leave": [member: GuildMember, voiceState: VoiceState]
	"voice:move": [member: GuildMember, oldState: VoiceState, newState: VoiceState]
	"voice:mute": [member: GuildMember, voiceState: VoiceState]
	"voice:unmute": [member: GuildMember, voiceState: VoiceState]
	"voice:deaf": [member: GuildMember, voiceState: VoiceState]
	"voice:undeaf": [member: GuildMember, voiceState: VoiceState]

	// Miembros
	"member:join": [member: GuildMember]
	"member:leave": [member: GuildMember | PartialGuildMember]
	"member:ban": [guild: Guild, userId: string]
	"member:unban": [guild: Guild, userId: string]

	// Clanes
	"clan:created": [data: { guildId: string; clanId: string; clanName: string; leaderId: string; createdBy: string }]
	"clan:deleted": [data: { guildId: string; clanId: string; clanName: string; deletedBy: string }]
	"clan:leaderAdded": [data: { guildId: string; clanId: string; clanName: string; leaderId: string; addedBy: string }]
	"clan:leaderRemoved": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		leaderId: string;
		removedBy: string
	}]
	"clan:memberAdded": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		memberId: string;
		addedBy: string
	}]
	"clan:memberKicked": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		memberId: string;
		removedBy: string
	}]
	"clan:memberLeft": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		memberId: string;
		removedBy: string
	}]
	"clan:extraChannelAdded": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		channelId: string;
		addedBy: string
	}]
	"clan:extraChannelRemoved": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		channelId: string;
		removedBy: string
	}]
	"clan:invitationCreated": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		invitedUserId: string;
		invitedBy: string;
		invitationId: string
	}]
	"clan:invitationAccepted": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		invitedUserId: string;
		invitedBy: string;
		invitationId: string
	}]
	"clan:invitationRejected": [data: {
		guildId: string;
		clanId: string;
		clanName: string;
		invitedUserId: string;
		invitedBy: string;
		invitationId: string
	}]
}

/**
 * EventEmitter tipado para eventos del bot
 */
class TypedEventEmitter extends EventEmitter {
	override emit<K extends keyof BotEvents> (event: K, ...args: BotEvents[K]): boolean {
		return super.emit(event, ...args)
	}

	override on<K extends keyof BotEvents> (event: K, listener: (...args: BotEvents[K]) => void): this {
		return super.on(event, listener)
	}

	override once<K extends keyof BotEvents> (event: K, listener: (...args: BotEvents[K]) => void): this {
		return super.once(event, listener)
	}

	override off<K extends keyof BotEvents> (event: K, listener: (...args: BotEvents[K]) => void): this {
		return super.off(event, listener)
	}
}

/**
 * Instancia única del EventEmitter del bot
 */
export const botEvents = new TypedEventEmitter()

// Aumentar el límite de listeners (útil para módulos que escuchan múltiples eventos)
botEvents.setMaxListeners(50)
