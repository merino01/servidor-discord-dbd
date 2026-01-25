import { Events, VoiceState } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { botEvents } from "@/core/events/bot-events"

function handleChannelChanges (oldState: VoiceState, newState: VoiceState): void {
	if (!newState.member) {return}
	const member = newState.member

	// Usuario se une a un canal de voz
	if (!oldState.channelId && newState.channelId) {
		botEvents.emit("voice:join", member, newState)
		return
	}

	// Usuario sale de un canal de voz
	if (oldState.channelId && !newState.channelId) {
		botEvents.emit("voice:leave", member, oldState)
		return
	}

	// Usuario se mueve entre canales
	if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
		botEvents.emit("voice:move", member, oldState, newState)
	}
}

function handleMuteChanges (oldState: VoiceState, newState: VoiceState): void {
	if (!newState.member) {return}
	const member = newState.member

	// Usuario se silencia (mute)
	if (!oldState.selfMute && newState.selfMute) {
		botEvents.emit("voice:mute", member, newState)
	}

	// Usuario se desilencia (unmute)
	if (oldState.selfMute && !newState.selfMute) {
		botEvents.emit("voice:unmute", member, newState)
	}
}

function handleDeafChanges (oldState: VoiceState, newState: VoiceState): void {
	if (!newState.member) {return}
	const member = newState.member

	// Usuario se ensordece (deaf)
	if (!oldState.selfDeaf && newState.selfDeaf) {
		botEvents.emit("voice:deaf", member, newState)
	}

	// Usuario se desensordece (undeaf)
	if (oldState.selfDeaf && !newState.selfDeaf) {
		botEvents.emit("voice:undeaf", member, newState)
	}
}

/**
 * Evento global de voiceStateUpdate
 * Se ejecuta cuando cambia el estado de voz de un miembro
 */
registerEvent(
	Events.VoiceStateUpdate,
	async (oldState: VoiceState, newState: VoiceState) => {
		if (!newState.member || newState.member.user.bot) {return}

		handleChannelChanges(oldState, newState)
		handleMuteChanges(oldState, newState)
		handleDeafChanges(oldState, newState)
	}
)
